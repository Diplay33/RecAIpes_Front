import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Container, Row, Col, Card, Button,
  Table, Alert, ProgressBar, InputGroup,
  Spinner
} from 'react-bootstrap';
import { 
  FaPlus, FaTrash, FaSync, 
  FaCogs, FaSearch, FaMagic, FaFilePdf
} from 'react-icons/fa';
import { useRecipes } from '../../hooks/useRecipes';
// Import the new, separated modal component
import GenerateModal from './GenerateModal';

const RecipeAdminApp = () => {
  const { 
    recipes, 
    loading, 
    error: recipesError, 
    loadRecipes, 
    deleteRecipe,
    refreshAfterGeneration 
  } = useRecipes();

  // The main component only needs to know if the modal should be shown,
  // and if a generation process is running.
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  
  // All form-related state has been moved to GenerateModal.jsx
  
  const [batchStatus, setBatchStatus] = useState('idle');
  const [batchProgress, setBatchProgress] = useState(0);
  const [jobId, setJobId] = useState(null);
  const progressInterval = useRef(null);
  
  const [filters, setFilters] = useState({
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    storageType: 'Bucket Externe'
  });

  useEffect(() => {
    updateStats(recipes);
  }, [recipes]);

  useEffect(() => {
    if (recipesError) {
      setError(recipesError);
    }
  }, [recipesError]);
  
  useEffect(() => {
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, []);

  const updateStats = (recipesData) => {
    const today = new Date().toDateString();
    const todayCount = recipesData.filter(recipe => 
      new Date(recipe.createdAt).toDateString() === today
    ).length;
    
    setStats(prev => ({
      ...prev,
      total: recipesData.length,
      today: todayCount
    }));
  };

  const checkGenerationStatus = async (id) => {
    try {
      const response = await fetch(`/api/recipes/batch/status/${id}`);
      if (!response.ok) return null;
      
      const statusData = await response.json();
      setBatchProgress(statusData.progress || 0);
      
      if (statusData.status === 'completed') {
        setBatchStatus('completed');
        clearInterval(progressInterval.current);
        progressInterval.current = null;
        
        setTimeout(() => {
          setBatchStatus('idle');
          setBatchProgress(0);
          setGenerating(false);
          setJobId(null);
          refreshAfterGeneration();
        }, 2000);
      } else if (statusData.status === 'error') {
        setBatchStatus('error');
        setError(statusData.error || 'Erreur lors de la génération');
        clearInterval(progressInterval.current);
        progressInterval.current = null;
        setGenerating(false);
      }
      
      return statusData;
    } catch (error) {
      console.error('Erreur vérification statut:', error);
      return null;
    }
  };

  const startProgressPolling = (id) => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    progressInterval.current = setInterval(() => checkGenerationStatus(id), 1500);
  };

  /**
   * This function now receives the form data directly from the modal component.
   * @param {object} generationConfig - The configuration from the modal.
   * @param {string} generationConfig.type - The type of generation (single, menu, etc.).
   * @param {object} generationConfig.data - The form values.
   */
  const handleGenerate = async ({ type, data }) => {
    setGenerating(true);
    setShowGenerateModal(false);
    setBatchStatus('running');
    setBatchProgress(0);

    try {
      let endpoint = '';
      let payload = {};

      switch (type) {
        case 'single':
          endpoint = '/api/recipes';
          payload = { dishName: data.dishName, userName: data.userName };
          break;
        case 'menu':
          endpoint = '/api/recipes/batch/menu';
          payload = { userName: data.userName, theme: data.menuTheme };
          break;
        case 'theme':
          endpoint = '/api/recipes/batch/theme';
          payload = { userName: data.userName, theme: data.themeType, count: data.themeCount };
          break;
        case 'custom':
          endpoint = '/api/recipes/batch/custom';
          payload = { userName: data.userName, dishes: data.customDishes.split('\n').filter(d => d.trim()) };
          break;
        default:
          throw new Error('Unknown generation type');
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.jobId) {
          setJobId(result.jobId);
          startProgressPolling(result.jobId);
        } else {
          simulateBatchProgress(type === 'single' ? 3000 : 6000);
        }
      } else {
        throw new Error('Échec de la génération');
      }
    } catch (error) {
      setBatchStatus('error');
      setError('Erreur lors de la génération: ' + error.message);
      setGenerating(false);
    }
  };

  const simulateBatchProgress = (duration = 4000) => {
    // This function remains the same, but it's good practice to keep it
    // in the component that manages the progress bar state.
    setBatchStatus('running');
    setBatchProgress(0);
    let progress = 0;
    const intervalTime = duration / 8; // generic steps
    
    if (progressInterval.current) clearInterval(progressInterval.current);
    
    progressInterval.current = setInterval(() => {
      progress += 12.5; // 100 / 8 steps
      setBatchProgress(Math.min(progress, 100));
      
      if (progress >= 100) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
        setBatchStatus('completed');
        setTimeout(() => {
          setBatchStatus('idle');
          setBatchProgress(0);
          setGenerating(false);
          refreshAfterGeneration();
        }, 2000);
      }
    }, intervalTime);
  };
  
  const handleDeleteRecipe = async (fileId, fileName) => {
    if (!window.confirm(`Confirmer la suppression de "${fileName}" ?`)) return;
    try {
      await deleteRecipe(fileId);
      setError(null);
    } catch (err) {
      setError('Erreur lors de la suppression: ' + err.message);
    }
  };

  const filteredRecipes = recipes.filter(recipe => {
    const searchTerm = filters.search.toLowerCase();
    return recipe.title.toLowerCase().includes(searchTerm) ||
           recipe.ingredients.toLowerCase().includes(searchTerm) ||
           (recipe.fileName && recipe.fileName.toLowerCase().includes(searchTerm));
  });

  const sortedRecipes = [...filteredRecipes].sort((a, b) => {
    const aVal = a[filters.sortBy];
    const bVal = b[filters.sortBy];
    return filters.sortOrder === 'desc' ? new Date(bVal) - new Date(aVal) : new Date(aVal) - new Date(bVal);
  });

  // The components below are unchanged, but they are now cleaner as they don't live
  // next to a giant modal definition.
  const StatsCards = () => ( /* ... JSX unchanged ... */ <Row className="mb-4">
      <Col md={3}>
        <Card className="bg-primary text-white">
          <Card.Body>
            <div className="d-flex justify-content-between">
              <div>
                <h4>{stats.total}</h4>
                <p>PDFs Bucket</p>
              </div>
              <FaFilePdf size={32} />
            </div>
          </Card.Body>
        </Card>
      </Col>
      <Col md={3}>
        <Card className="bg-success text-white">
          <Card.Body>
            <div className="d-flex justify-content-between">
              <div>
                <h4>{stats.today}</h4>
                <p>Aujourd'hui</p>
              </div>
              <FaPlus size={32} />
            </div>
          </Card.Body>
        </Card>
      </Col>
      <Col md={3}>
        <Card className="bg-info text-white">
          <Card.Body>
            <div className="d-flex justify-content-between">
              <div>
                <h4>{stats.storageType}</h4>
                <p>Stockage</p>
              </div>
              <FaCogs size={32} />
            </div>
          </Card.Body>
        </Card>
      </Col>
      <Col md={3}>
        <Card className="bg-warning text-white">
          <Card.Body>
            <div className="d-flex justify-content-between">
              <div>
                <h4>{batchStatus === 'running' ? 'En cours' : 'Prêt'}</h4>
                <p>Génération</p>
              </div>
              <FaMagic size={32} />
            </div>
          </Card.Body>
        </Card>
      </Col>
    </Row>);
  const BatchProgressBar = () => ( /* ... JSX unchanged ... */  (batchStatus !== 'running') ? null : (
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <h5>Génération en cours...</h5>
              <ProgressBar now={batchProgress} animated striped variant="primary" label={`${Math.round(batchProgress)}%`}/>
              <p className="mt-2">{batchProgress < 100 ? `Progression - ${Math.round(batchProgress)}%` : 'Terminé ! Rafraîchissement...'}</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    ));
  const RecipesTable = () => ( /* ... JSX unchanged ... */ <Card>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5>PDFs Recettes (Bucket Externe)</h5>
        <div>
          <Button variant="success" className="me-2" onClick={() => setShowGenerateModal(true)} disabled={generating}>
            <FaPlus className="me-2" />
            {generating ? 'Génération...' : 'Générer des Recettes'}
          </Button>
          <Button variant="outline-primary" onClick={loadRecipes}><FaSync className="me-2" />Rafraîchir Bucket</Button>
        </div>
      </Card.Header>
      <Card.Body>
        <Row className="mb-3">
          <Col md={8}>
            <InputGroup>
              <Form.Control placeholder="Rechercher..." value={filters.search} onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}/>
              <Button variant="outline-secondary"><FaSearch /></Button>
            </InputGroup>
          </Col>
          <Col md={4}>
            <Form.Select value={filters.sortOrder} onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value }))}>
              <option value="desc">Plus récent en premier</option>
              <option value="asc">Plus ancien en premier</option>
            </Form.Select>
          </Col>
        </Row>
        {loading ? (
          <div className="text-center p-4"><Spinner animation="border" variant="primary" /><p className="mt-2">Chargement du bucket...</p></div>
        ) : (
          <Table responsive hover>
            <thead><tr><th>PDF</th><th>Titre</th><th>Ingrédients</th><th>Créé par</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {sortedRecipes.length === 0 ? (
                <tr><td colSpan={6} className="text-center p-4"><p>Aucune recette trouvée.</p><Button variant="primary" onClick={() => setShowGenerateModal(true)}>Générer votre première recette</Button></td></tr>
              ) : (
                sortedRecipes.map(recipe => (
                  <tr key={recipe.id}>
                    <td><a href={recipe.pdfUrl} target="_blank" rel="noopener noreferrer"><FaFilePdf size={32} className="text-danger" /></a></td>
                    <td><strong>{recipe.title}</strong><br /><small className="text-muted">{recipe.fileName}</small></td>
                    <td><small>{recipe.ingredients}</small></td>
                    <td>{recipe.createdBy}</td>
                    <td>{new Date(recipe.createdAt).toLocaleDateString()}</td>
                    <td><Button size="sm" variant="outline-danger" onClick={() => handleDeleteRecipe(recipe.id, recipe.title)} title="Supprimer"><FaTrash /></Button></td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>);

  return (
    <Container fluid>
      <div className="bg-primary text-white p-3 mb-4">
        <h2><FaCogs className="me-2" />Recaipes - Bucket PDFs</h2>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <StatsCards />
      <BatchProgressBar />
      <RecipesTable />
      
      {/* The modal is now rendered here. It's a clean, single line. */}
      <GenerateModal 
        show={showGenerateModal}
        onHide={() => setShowGenerateModal(false)}
        onGenerate={handleGenerate}
        isGenerating={generating}
      />
    </Container>
  );
};

export default RecipeAdminApp;