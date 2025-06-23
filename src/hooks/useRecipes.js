import { useState, useEffect, useCallback } from 'react';

export const useRecipes = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadRecipes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/bucket/search');
      
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Erreur du serveur (statut ${response.status}): ${errorBody}`);
      }
      
      const bucketData = await response.json();
      
      // The backend wraps the response in a "results" object.
      // We must pass bucketData.results to the transform function.
      const transformedRecipes = transformPublicBucketDataToRecipes(bucketData.results);
      
      setRecipes(transformedRecipes);

    } catch (err) {
      console.error('Erreur lors du chargement des recettes:', err);
      setError(err.message || 'Erreur lors du chargement des recettes depuis le bucket');
    } finally {
      setLoading(false);
    }
  }, []);

  const createRecipe = async (recipeData) => {
    try {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': process.env.REACT_APP_API_KEY
        },
        body: JSON.stringify(recipeData)
      });
      if (!response.ok) {
        throw new Error('Erreur lors de la création');
      }
      return await response.json();
    } catch (err) {
      throw new Error('Erreur lors de la création: ' + err.message);
    }
  };

  const deleteRecipe = async (fileId) => {
    try {
      const response = await fetch(`/api/bucket/test-delete-by-id/${fileId}`, {
        method: 'DELETE',
        headers: {
          'X-API-Key': process.env.REACT_APP_API_KEY
        }
      });
      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }
      setRecipes(prev => prev.filter(recipe => recipe.id !== fileId));
    } catch (err) {
      throw new Error('Erreur lors de la suppression: ' + err.message);
    }
  };

  const transformPublicBucketDataToRecipes = (resultsData) => {
    // The actual array is in resultsData.studentUploadReadingDTOS
    if (!resultsData || !Array.isArray(resultsData.studentUploadReadingDTOS)) {
      console.warn("La structure de données attendue ('results.studentUploadReadingDTOS') est absente ou n'est pas un tableau.");
      return [];
    }

    return resultsData.studentUploadReadingDTOS.map(file => ({
      id: file.idExterne,
      // We also clean the "TITRE: " prefix from the tag here
      title: (file.tag2 || 'Recette sans nom'),
      pdfUrl: file.url,
      description: `PDF généré - ${file.tag3}`,
      // For ingredients, we only display if it's not the default "recipe" tag.
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
    setTimeout(() => {
      loadRecipes();
    }, 2000);
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