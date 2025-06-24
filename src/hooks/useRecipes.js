import { useState, useEffect, useCallback } from 'react';

export const useRecipes = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadRecipes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/bucket/search', {
        method: 'GET',
        headers: {
          'X-API-Key': process.env.REACT_APP_API_KEY
        }
      });
      
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Erreur du serveur (statut ${response.status}): ${errorBody}`);
      }
      
      const bucketData = await response.json();
      
      const transformedRecipes = transformPublicBucketDataToRecipes(bucketData.results);
      
      setRecipes(transformedRecipes);

    } catch (err) {
      console.error('Erreur lors du chargement des recettes:', err);
      setError(err.message || 'Erreur lors du chargement des recettes depuis le bucket');
    } finally {
      setLoading(false);
    }
  }, []);

  // ... (createRecipe et deleteRecipe ne changent pas)

  const transformPublicBucketDataToRecipes = (resultsData) => {
    if (!resultsData || !Array.isArray(resultsData.studentUploadReadingDTOS)) {
      console.warn("La structure de données attendue ('results.studentUploadReadingDTOS') est absente ou n'est pas un tableau.");
      return [];
    }

    return resultsData.studentUploadReadingDTOS.map(file => ({
      id: file.idExterne,
      title: (file.tag2 || 'Recette sans nom'),
      pdfUrl: file.url,
      
      // --- AJOUT ---
      // On récupère l'URL de la miniature depuis les données de l'API.
      // On utilise `|| null` pour s'assurer que la propriété existe toujours.
      thumbnailUrl: file.thumbnailUrl || null,
      
      description: `PDF généré - ${file.tag3}`,
      ingredients: (file.tag1 && file.tag1 !== 'recipe') ? file.tag1 : 'N/A',
      createdBy: 'Utilisateur',
      createdAt: file.tag3 || new Date().toISOString(),
      fileName: file.url.substring(file.url.lastIndexOf('/') + 1),
      source: 'bucket-public',
      tag1: file.tag1,
      tag2: file.tag2,
      tag3: file.tag3
    }));
  };

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  const refreshAfterGeneration = useCallback(() => {
    console.log("Génération terminée. Rafraîchissement de la liste dans 5 secondes...");
    setTimeout(() => {
      console.log("Rafraîchissement en cours...");
      loadRecipes();
    }, 5000);
  }, [loadRecipes]);

  return {
    recipes,
    loading,
    error,
    loadRecipes,
    createRecipe,
    deleteRecipe,
    refreshAfterGeneration
  };
};