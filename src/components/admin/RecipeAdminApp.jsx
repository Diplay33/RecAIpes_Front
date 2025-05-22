import React, { useState, useEffect, useCallback } from 'react';
import { 
  Container, Row, Col, Card, Button, Modal, Form, 
  Table, Badge, Alert, ProgressBar, InputGroup,
  Dropdown, Spinner
} from 'react-bootstrap';
import { 
  FaPlus, FaEdit, FaTrash, FaFilePdf, FaSync, 
  FaCogs, FaSearch, FaFilter, FaMagic
} from 'react-icons/fa';

const RecipeAdminApp = () => {
  // États principaux
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // États pour les modales
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  
  // États pour la génération en chaîne
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchStatus, setBatchStatus] = useState('idle'); // idle, running, completed, error
  const [batchConfig, setBatchConfig] = useState({
    type: 'menu',
    theme: 'italien',
    userName: 'admin',
    customDishes: ''
  });
  
  // États pour les filtres
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  
  // États pour les statistiques
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    storageType: 'Local'
  });

  // Chargement initial
  useEffect(() => {
    loadRecipes();
    loadStorageInfo();
  }, []);

  // Chargement des recettes
  const loadRecipes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/recipes');
      if (!response.ok) throw new Error('Erreur de chargement');
      
      const data = await response.json();
      setRecipes(data);
      updateStats(data);
      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement des recettes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Chargement des infos de stockage
  const loadStorageInfo = async () => {
    try {
      const response = await fetch('/api/storage/info');
      const info = await response.json();
      setStats(prev => ({ ...prev, storageType: info.activeStorageType }));
    } catch (err) {
      console.error('Erreur info stockage:', err);
    }
  };

  // Mise à jour des statistiques
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

  // Génération en chaîne
  const startBatchGeneration = async () => {
    setShowBatchModal(false);
    setBatchStatus('running');
    setBatchProgress(0);

    try {
      let endpoint = '';
      let payload = {};

      switch (batchConfig.type) {
        case 'menu':
          endpoint = '/api/recipes/batch/menu';
          payload = { userName: batchConfig.userName, theme: batchConfig.theme };
          break;
        case 'theme':
          endpoint = '/api/recipes/batch/theme';
          payload = { 
            userName: batchConfig.userName, 
            theme: batchConfig.theme, 
            count: 4 
          };
          break;
        case 'custom':
          endpoint = '/api/recipes/batch/custom';
          payload = { 
            userName: batchConfig.userName, 
            dishes: batchConfig.customDishes.split('\n').filter(d => d.trim()) 
          };
          break;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Échec génération');

      // Simulation du progrès (remplacer par WebSocket en production)
      simulateBatchProgress();
      
    } catch (err) {
      setBatchStatus('error');
      setError('Erreur lors de la génération en chaîne: ' + err.message);
    }
  };

  // Simulation du progrès de génération
  const simulateBatchProgress = () => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 25;
      setBatchProgress(progress);
      
      if (progress >= 100) {
        clearInterval(interval);
        setBatchStatus('completed');
        setTimeout(() => {
          setBatchStatus('idle');
          setBatchProgress(0);
          loadRecipes();
        }, 2000);
      }
    }, 3000);
  };

  // Suppression d'une recette
  const deleteRecipe = async (id) => {
    if (!window.confirm('Confirmer la suppression ?')) return;
    
    try {
      await fetch(`/api/recipes/${id}`, { method: 'DELETE' });
      loadRecipes();
    } catch (err) {
      setError('Erreur lors de la suppression');
    }
  };

  // Filtrage des recettes
  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.title.toLowerCase().includes(filters.search.toLowerCase()) ||
                         recipe.ingredients.toLowerCase().includes(filters.search.toLowerCase());
    const matchesCategory = !filters.category || recipe.category === filters.category;
    
    return matchesSearch && matchesCategory;
  });

  // Composant Statistiques
  const StatsCards = () => (
    <Row className="mb-4">
      <Col md={3}>
        <Card className="bg-primary text-white">
          <Card.Body>
            <div className="d-flex justify-content-between">
              <div>
                <h4>{stats.total}</h4>
                <p>Recettes Totales</p>
              </div>
              <FaEdit size={32} />
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
    </Row>
  );

  // Composant Barre de Progrès Batch
  const BatchProgressBar = () => {
    if (batchStatus !== 'running') return null;
    
    return (
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <h5>Génération en cours...</h5>
              <ProgressBar 
                now={batchProgress} 
                animated 
                striped 
                variant="primary"
                label={`${batchProgress}%`}
              />
              <p className="mt-2">
                {batchProgress < 100 ? 'Génération des recettes...' : 'Terminé !'}
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    );
  };

  // Composant Modal Génération Batch
  const BatchModal = () => (
    <Modal show={showBatchModal} onHide={() => setShowBatchModal(false)} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Génération en Chaîne</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Type de génération</Form.Label>
            <Form.Select 
              value={batchConfig.type}
              onChange={(e) => setBatchConfig(prev => ({ ...prev, type: e.target.value }))}
            >
              <option value="menu">Menu complet (Entrée + Plat + Dessert)</option>
              <option value="theme">Recettes par thème</option>
              <option value="custom">Personnalisé</option>
            </Form.Select>
          </Form.Group>

          {batchConfig.type === 'theme' && (
            <Form.Group className="mb-3">
              <Form.Label>Thème culinaire</Form.Label>
              <Form.Select
                value={batchConfig.theme}
                onChange={(e) => setBatchConfig(prev => ({ ...prev, theme: e.target.value }))}
              >
                <option value="italien">Cuisine Italienne</option>
                <option value="français">Cuisine Française</option>
                <option value="asiatique">Cuisine Asiatique</option>
                <option value="méditerranéen">Cuisine Méditerranéenne</option>
              </Form.Select>
            </Form.Group>
          )}

          {batchConfig.type === 'custom' && (
            <Form.Group className="mb-3">
              <Form.Label>Plats à générer (un par ligne)</Form.Label>
              <Form.Control
                as="textarea"
                rows={5}
                value={batchConfig.customDishes}
                onChange={(e) => setBatchConfig(prev => ({ ...prev, customDishes: e.target.value }))}
                placeholder="Exemple:&#10;Pizza margherita&#10;Pâtes carbonara&#10;Tiramisu"
              />
            </Form.Group>
          )}

          <Form.Group>
            <Form.Label>Nom d'utilisateur</Form.Label>
            <Form.Control
              type="text"
              value={batchConfig.userName}
              onChange={(e) => setBatchConfig(prev => ({ ...prev, userName: e.target.value }))}
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => setShowBatchModal(false)}>
          Annuler
        </Button>
        <Button variant="primary" onClick={startBatchGeneration}>
          <FaMagic className="me-2" />
          Démarrer la Génération
        </Button>
      </Modal.Footer>
    </Modal>
  );

  // Composant Table des Recettes
  const RecipesTable = () => (
    <Card>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5>Gestion des Recettes</h5>
        <div>
          <Button 
            variant="success" 
            className="me-2"
            onClick={() => setShowBatchModal(true)}
          >
            <FaPlus className="me-2" />
            Génération en Chaîne
          </Button>
          <Button variant="outline-primary" onClick={loadRecipes}>
            <FaSync className="me-2" />
            Actualiser
          </Button>
        </div>
      </Card.Header>
      <Card.Body>
        {/* Filtres */}
        <Row className="mb-3">
          <Col md={6}>
            <InputGroup>
              <Form.Control
                placeholder="Rechercher par titre, ingrédients..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
              <Button variant="outline-secondary">
                <FaSearch />
              </Button>
            </InputGroup>
          </Col>
          <Col md={6}>
            <Form.Select 
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            >
              <option value="">Toutes les catégories</option>
              <option value="ENTREE">Entrées</option>
              <option value="PLAT_PRINCIPAL">Plats principaux</option>
              <option value="DESSERT">Desserts</option>
              <option value="BOISSON">Boissons</option>
            </Form.Select>
          </Col>
        </Row>

        {/* Table */}
        {loading ? (
          <div className="text-center p-4">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2">Chargement...</p>
          </div>
        ) : (
          <Table responsive hover>
            <thead>
              <tr>
                <th>Image</th>
                <th>Titre</th>
                <th>Catégorie</th>
                <th>Créé par</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecipes.map(recipe => (
                <tr key={recipe.id}>
                  <td>
                    <img 
                      src={recipe.imageUrl} 
                      alt={recipe.title}
                      style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '8px' }}
                    />
                  </td>
                  <td>
                    <strong>{recipe.title}</strong>
                    <br />
                    <small className="text-muted">
                      {recipe.description?.substring(0, 50)}...
                    </small>
                  </td>
                  <td>
                    <Badge bg="secondary">
                      {recipe.category || 'Non classé'}
                    </Badge>
                  </td>
                  <td>{recipe.createdBy}</td>
                  <td>{new Date(recipe.createdAt).toLocaleDateString()}</td>
                  <td>
                    <Button 
                      size="sm" 
                      variant="outline-primary" 
                      className="me-1"
                      onClick={() => {
                        setEditingRecipe(recipe);
                        setShowEditModal(true);
                      }}
                    >
                      <FaEdit />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline-success" 
                      className="me-1"
                      onClick={() => window.open(recipe.pdfUrl, '_blank')}
                    >
                      <FaFilePdf />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline-danger"
                      onClick={() => deleteRecipe(recipe.id)}
                    >
                      <FaTrash />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );

  return (
    <Container fluid>
      <div className="bg-primary text-white p-3 mb-4">
        <h2><FaCogs className="me-2" />Recaipes - Administration</h2>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <StatsCards />
      <BatchProgressBar />
      <RecipesTable />
      
      <BatchModal />
    </Container>
  );
};

export default RecipeAdminApp;