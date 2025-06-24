import React, { useState } from 'react';
import { Modal, Button, Form, Row, Col, Spinner } from 'react-bootstrap';
import { FaMagic } from 'react-icons/fa';

/**
 * A self-contained and memoized component for the recipe generation modal.
 * It manages its own internal form state to prevent re-render issues in the parent.
 */
const GenerateModal = ({ show, onHide, onGenerate, isGenerating }) => {
  // All form-related state is now managed inside the modal itself.
  const [generationType, setGenerationType] = useState('single');
  const [formValues, setFormValues] = useState({
    dishName: '',
    userName: 'admin',
    menuTheme: 'italien',
    themeType: 'italien',
    themeCount: 4,
    customDishes: '',
  });

  // This handler now updates the local state of the modal.
  const handleFormChange = (field, value) => {
    setFormValues(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    // When submitting, we call the onGenerate prop with all the collected data.
    if (!isGenerating && isGenerateConfigValid()) {
      onGenerate({ type: generationType, data: formValues });
    }
  };
  
  // Validation logic now lives inside the modal.
  const isGenerateConfigValid = () => {
    switch (generationType) {
      case 'single':
        return formValues.dishName.trim().length > 0;
      case 'menu':
        return formValues.menuTheme.length > 0;
      case 'theme':
        return formValues.themeType.length > 0;
      case 'custom':
        return formValues.customDishes.trim().length > 0;
      default:
        return false;
    }
  };

  // Button text logic also lives inside the modal.
  const getGenerateButtonText = () => {
    switch (generationType) {
      case 'single':
        return 'Générer la Recette';
      case 'menu':
        return 'Générer le Menu (3 recettes)';
      case 'theme':
        return `Générer ${formValues.themeCount} Recettes`;
      case 'custom':
        const dishCount = formValues.customDishes.split('\n').filter(d => d.trim()).length;
        return `Générer ${dishCount || 0} Recette${dishCount > 1 ? 's' : ''}`;
      default:
        return 'Générer';
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Générer des Recettes PDF</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-4">
          <Form.Label><strong>Type de génération</strong></Form.Label>
          <div className="d-flex gap-3 flex-wrap">
            {[
              { key: 'single', label: 'Recette Simple', icon: '🍽️' },
              { key: 'menu', label: 'Menu Complet', icon: '🍽️🥗🍰' },
              { key: 'theme', label: 'Par Thème', icon: '🌍' },
              { key: 'custom', label: 'Personnalisé', icon: '✨' },
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

        {generationType === 'single' && (
          <div>
            <h6>Recette Simple → PDF Bucket</h6>
            <Form.Group className="mb-3">
              <Form.Label>Nom du plat</Form.Label>
              <Form.Control
                type="text"
                placeholder="Ex: Pizza Margherita"
                value={formValues.dishName}
                onChange={(e) => handleFormChange('dishName', e.target.value)}
                autoFocus
              />
            </Form.Group>
            <small className="text-muted">
              La recette sera générée avec l'IA et automatiquement stockée sur le bucket externe.
            </small>
          </div>
        )}

        {generationType === 'menu' && (
          <div>
            <h6>Menu Complet → 3 PDFs Bucket</h6>
            <Form.Group className="mb-3">
              <Form.Label>Thème du menu</Form.Label>
              <Form.Select
                value={formValues.menuTheme}
                onChange={(e) => handleFormChange('menuTheme', e.target.value)}
              >
                <option value="italien">🇮🇹 Cuisine Italienne</option>
                <option value="français">🇫🇷 Cuisine Française</option>
                <option value="asiatique">🥢 Cuisine Asiatique</option>
                <option value="méditerranéen">🌊 Cuisine Méditerranéenne</option>
                <option value="mexicain">🌮 Cuisine Mexicaine</option>
              </Form.Select>
            </Form.Group>
          </div>
        )}

        {generationType === 'theme' && (
          <div>
            <h6>Recettes par Thème → Multiple PDFs</h6>
            <Row>
              <Col md={8}>
                <Form.Group className="mb-3">
                  <Form.Label>Thème culinaire</Form.Label>
                  <Form.Select
                    value={formValues.themeType}
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
                    value={formValues.themeCount}
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
          </div>
        )}

        {generationType === 'custom' && (
          <div>
            <h6>Recettes Personnalisées → PDFs Multiples</h6>
            <Form.Group className="mb-3">
              <Form.Label>Liste des plats (un par ligne)</Form.Label>
              <Form.Control
                as="textarea"
                rows={6}
                placeholder={`Exemple:\nTacos au poisson\nCrème brûlée à la vanille\nSalade César\nRisotto aux champignons`}
                value={formValues.customDishes}
                onChange={(e) => handleFormChange('customDishes', e.target.value)}
              />
            </Form.Group>
          </div>
        )}
        
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={isGenerating}>
          Annuler
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={isGenerating || !isGenerateConfigValid()}
        >
          {isGenerating ? (
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

export default GenerateModal;