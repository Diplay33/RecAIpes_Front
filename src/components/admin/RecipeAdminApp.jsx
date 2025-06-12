import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Container, Row, Col, Card, Button, Modal, Form, 
  Table, Badge, Alert, ProgressBar, InputGroup,
  Dropdown, Spinner
} from 'react-bootstrap';
import { 
  FaPlus, FaEdit, FaTrash, FaSync, 
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
  
  // États pour la génération de recettes
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generationType, setGenerationType] = useState('single'); // single, menu, theme, custom
  const [generating, setGenerating] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  
  // État du formulaire
  const [formData, setFormData] = useState({
    dishName: '',
    userName: 'admin',
    menuTheme: 'italien',
    themeType: 'italien',
    themeCount: 4,
    customDishes: ''
  });
  
  // États pour le batch processing
  const [batchStatus, setBatchStatus] = useState('idle'); // idle, running, completed, error
  const [batchProgress, setBatchProgress] = useState(0);
  const [jobId, setJobId] = useState(null);
  const progressInterval = useRef(null); // Référence pour l'intervalle de polling
  
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
  
  // Vérifier la validité du formulaire
  useEffect(() => {
    validateForm();
  }, [formData, generationType]);
  
  // Nettoyage de l'intervalle lors du démontage du composant
  useEffect(() => {
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
    };
  }, []);
  
  // Valider le formulaire
  const validateForm = () => {
    let valid = false;
    
    switch (generationType) {
      case 'single':
        valid = formData.dishName && formData.dishName.trim().length > 0;
        break;
      case 'menu':
        valid = true; // Le menu a toujours un thème
        break;
      case 'theme':
        valid = true; // Le thème a toujours une valeur
        break;
      case 'custom':
        valid = formData.customDishes && formData.customDishes.trim().length > 0;
        break;
      default:
        valid = false;
    }
    
    setIsFormValid(valid);
  };

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

  // Fonction pour vérifier le statut de la génération
  const checkGenerationStatus = async (id) => {
    try {
      const response = await fetch(`/api/recipes/batch/status/${id}`);
      
      if (!response.ok) {
        throw new Error('Erreur lors de la vérification du statut');
      }
      
      const statusData = await response.json();
      
      // Mettre à jour la barre de progression avec les vraies données
      setBatchProgress(statusData.progress || 0);
      
      // Mettre à jour le statut du batch
      if (statusData.status === 'completed') {
        setBatchStatus('completed');
        // Arrêter le polling quand c'est terminé
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
          progressInterval.current = null;
        }
        
        // Réinitialiser après un délai
        setTimeout(() => {
          setBatchStatus('idle');
          setBatchProgress(0);
          setGenerating(false);
          setJobId(null);
          loadRecipes(); // Charger les nouvelles recettes
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
      console.error('Erreur lors de la vérification du statut:', error);
      // En cas d'erreur de l'API, on utilise une simulation de progression
      return null;
    }
  };

  // Démarrer le polling pour la progression
  const startProgressPolling = (id) => {
    // Arrêter tout intervalle existant
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    
    // Définir le nouvel intervalle de polling (toutes les 1.5 secondes)
    progressInterval.current = setInterval(() => {
      checkGenerationStatus(id);
    }, 1500);
  };

  // Fonction améliorée pour la simulation de progression
  const simulateBatchProgress = (duration = 10000) => {
    setBatchStatus('running');
    setBatchProgress(0);
    
    // Calculer les pas de progression plus petits pour une progression plus fluide
    const steps = 50; // Plus de pas pour une animation plus fluide
    const interval = duration / steps;
    
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    
    let currentProgress = 0;
    
    // Fonction pour calculer une progression non linéaire
    const calculateNextProgress = (current) => {
      // Au début, la progression est lente
      if (current < 20) {
        return current + 0.5; // Petit incrément pour démarrer lentement
      } 
      // Au milieu, la progression est modérée
      else if (current < 60) {
        return current + 1.5; // Incrément moyen
      }
      // Vers la fin, la progression accélère
      else {
        return current + 2.5; // Grand incrément pour terminer rapidement
      }
    };
    
    progressInterval.current = setInterval(() => {
      currentProgress = calculateNextProgress(currentProgress);
      
      if (currentProgress >= 100) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
        setBatchProgress(100);
        setBatchStatus('completed');
        
        setTimeout(() => {
          setBatchStatus('idle');
          setBatchProgress(0);
          setGenerating(false);
          loadRecipes();
        }, 2000);
      } else {
        setBatchProgress(currentProgress);
      }
    }, interval);
  };

  // Gestionnaire de changement de formulaire 
  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Fonction pour obtenir le texte du bouton
  const getGenerateButtonText = () => {
    switch (generationType) {
      case 'single':
        return 'Générer la Recette';
      case 'menu':
        return 'Générer le Menu (3 recettes)';
      case 'theme':
        return `Générer ${formData.themeCount} Recettes`;
      case 'custom':
        const dishCount = formData.customDishes.split('\n').filter(d => d.trim()).length;
        return `Générer ${dishCount > 0 ? dishCount : 0} Recette${dishCount > 1 ? 's' : ''}`;
      default:
        return 'Générer';
    }
  };

  // Fonction pour générer la recette
  const handleGenerate = async () => {
    setGenerating(true);
    setShowGenerateModal(false);
    setBatchStatus('running');
    setBatchProgress(0);

    try {
      let endpoint = '';
      let payload = {};

      switch (generationType) {
        case 'single':
          endpoint = '/api/recipes';
          payload = { 
            dishName: formData.dishName, 
            userName: formData.userName 
          };
          break;
          
        case 'menu':
          endpoint = '/api/recipes/batch/menu';
          payload = { 
            userName: formData.userName, 
            theme: formData.menuTheme 
          };
          break;
          
        case 'theme':
          endpoint = '/api/recipes/batch/theme';
          payload = { 
            userName: formData.userName, 
            theme: formData.themeType, 
            count: formData.themeCount 
          };
          break;
          
        case 'custom':
          endpoint = '/api/recipes/batch/custom';
          payload = { 
            userName: formData.userName, 
            dishes: formData.customDishes.split('\n').filter(d => d.trim()) 
          };
          break;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        
        // Si le backend renvoie un ID de tâche, utiliser le polling
        if (result.jobId) {
          setJobId(result.jobId);
          startProgressPolling(result.jobId);
        } else {
          // Sinon, utiliser la simulation améliorée
          simulateBatchProgress(generationType === 'single' ? 8000 : 15000);
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
                         recipe.ingredients?.toLowerCase().includes(filters.search.toLowerCase());
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

  const BatchProgressBar = () => {
    if (batchStatus !== 'running') return null;
    
    return (
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <h5>
                {generationType === 'single' ? 'Génération de la recette...' : 'Génération en cours...'}
              </h5>
              <ProgressBar 
                now={batchProgress} 
                animated 
                striped 
                variant="primary"
                label={`${Math.round(batchProgress)}%`}
              />
              <p className="mt-2">
                {batchProgress < 100 ? 
                  `${getGenerateButtonText()} - ${Math.round(batchProgress)}%` : 
                  'Terminé !'
                }
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    );
  };

  // Composant Modal de Génération
  const GenerateModal = () => {
    // Réinitialiser la validité lors de l'ouverture
    useEffect(() => {
      if (showGenerateModal) {
        validateForm();
      }
    }, [showGenerateModal]);
    
    return (
      <Modal 
        show={showGenerateModal} 
        onHide={() => setShowGenerateModal(false)} 
        size="lg"
        backdrop="static" 
      >
        <Modal.Header closeButton>
          <Modal.Title>Générer des Recettes</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Sélecteur de type */}
          <Form.Group className="mb-4">
            <Form.Label><strong>Type de génération</strong></Form.Label>
            <div className="d-flex gap-3 flex-wrap">
              {[
                { key: 'single', label: 'Recette Simple', icon: '🍽️' },
                { key: 'menu', label: 'Menu Complet', icon: '🍽️🥗🍰' },
                { key: 'theme', label: 'Par Thème', icon: '🌍' },
                { key: 'custom', label: 'Personnalisé', icon: '✨' }
              ].map(type => (
                <Button
                  key={type.key}
                  variant={generationType === type.key ? 'primary' : 'outline-primary'}
                  onClick={() => setGenerationType(type.key)}
                  className="flex-fill"
                >
                  {type.icon} {type.label}
                </Button>
              ))}
            </div>
          </Form.Group>

          {/* Formulaires spécifiques selon le type */}
          {generationType === 'single' && (
            <div>
              <h6>Recette Simple</h6>
              <Form.Group className="mb-3">
                <Form.Label>Nom du plat</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Ex: Pizza Margherita"
                  value={formData.dishName}
                  onChange={(e) => handleFormChange('dishName', e.target.value)}
                />
              </Form.Group>
            </div>
          )}

          {generationType === 'menu' && (
            <div>
              <h6>Menu Complet (Entrée + Plat + Dessert)</h6>
              <Form.Group className="mb-3">
                <Form.Label>Thème du menu</Form.Label>
                <Form.Select
                  value={formData.menuTheme}
                  onChange={(e) => handleFormChange('menuTheme', e.target.value)}
                >
                  <option value="italien">🇮🇹 Cuisine Italienne</option>
                  <option value="français">🇫🇷 Cuisine Française</option>
                  <option value="asiatique">🥢 Cuisine Asiatique</option>
                  <option value="méditerranéen">🌊 Cuisine Méditerranéenne</option>
                  <option value="mexicain">🌮 Cuisine Mexicaine</option>
                </Form.Select>
              </Form.Group>
              <small className="text-muted">
                Génère automatiquement une entrée, un plat principal et un dessert du thème choisi.
              </small>
            </div>
          )}

          {generationType === 'theme' && (
            <div>
              <h6>Recettes par Thème</h6>
              <Row>
                <Col md={8}>
                  <Form.Group className="mb-3">
                    <Form.Label>Thème culinaire</Form.Label>
                    <Form.Select
                      value={formData.themeType}
                      onChange={(e) => handleFormChange('themeType', e.target.value)}
                    >
                      <option value="italien">🇮🇹 Cuisine Italienne</option>
                      <option value="français">🇫🇷 Cuisine Française</option>
                      <option value="asiatique">🥢 Cuisine Asiatique</option>
                      <option value="indien">🇮🇳 Cuisine Indienne</option>
                      <option value="mexicain">🌮 Cuisine Mexicaine</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Nombre de recettes</Form.Label>
                    <Form.Select
                      value={formData.themeCount}
                      onChange={(e) => handleFormChange('themeCount', parseInt(e.target.value))}
                    >
                      <option value={2}>2 recettes</option>
                      <option value={3}>3 recettes</option>
                      <option value={4}>4 recettes</option>
                      <option value={5}>5 recettes</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
              <small className="text-muted">
                Génère plusieurs recettes typiques du thème sélectionné.
              </small>
            </div>
          )}

          {generationType === 'custom' && (
            <div>
              <h6>Recettes Personnalisées</h6>
              <Form.Group className="mb-3">
                <Form.Label>Liste des plats (un par ligne)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={6}
                  placeholder={`Exemple:\nTacos au poisson\nCrème brûlée à la vanille\nSalade César\nRisotto aux champignons`}
                  value={formData.customDishes}
                  onChange={(e) => handleFormChange('customDishes', e.target.value)}
                />
              </Form.Group>
              <small className="text-muted">
                Écrivez chaque plat sur une nouvelle ligne. L'IA générera une recette pour chacun.
              </small>
            </div>
          )}

          {/* Nom d'utilisateur */}
          <Form.Group className="mt-4">
            <Form.Label>Nom d'utilisateur</Form.Label>
            <Form.Control
              type="text"
              value={formData.userName}
              onChange={(e) => handleFormChange('userName', e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowGenerateModal(false)}>
            Annuler
          </Button>
          <Button 
            variant="primary" 
            onClick={handleGenerate}
            disabled={generating || !isFormValid}
          >
            {generating ? (
              <>
                <Spinner size="sm" className="me-2" />
                Génération...
              </>
            ) : (
              <>
                <FaMagic className="me-2" />
                {getGenerateButtonText()}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    );
  };

  // Composant Table des Recettes
  const RecipesTable = () => (
    <Card>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5>Gestion des Recettes</h5>
        <div>
          <Button 
            variant="success" 
            className="me-2"
            onClick={() => {
              // Réinitialiser les champs avant d'ouvrir le modal
              setFormData({
                dishName: '',
                userName: 'admin',
                menuTheme: 'italien',
                themeType: 'italien',
                themeCount: 4,
                customDishes: ''
              });
              setShowGenerateModal(true);
            }}
            disabled={generating}
          >
            <FaPlus className="me-2" />
            {generating ? 'Génération...' : 'Générer des Recettes'}
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
      
      <GenerateModal />
    </Container>
  );
};

export default RecipeAdminApp;