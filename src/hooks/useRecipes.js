import { useState, useEffect, useCallback } from 'react';

export const useRecipes = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * --- MODIFIED FUNCTION ---
   * This function now calls the public search endpoint and processes the new data structure.
   */
  const loadRecipes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // We now call the public search endpoint.
      const response = await fetch('/api/bucket/search');
      
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Erreur du serveur (statut ${response.status}): ${errorBody}`);
      }
      
      const bucketData = await response.json();
      
      // The new function to transform data from the public search response.
      const transformedRecipes = transformPublicBucketDataToRecipes(bucketData);
      
      setRecipes(transformedRecipes);

    } catch (err) {
      console.error('Erreur lors du chargement des recettes:', err);
      setError(err.message || 'Erreur lors du chargement des recettes depuis le bucket');
    } finally {
      setLoading(false);
    }
  }, []);

  // createRecipe and deleteRecipe remain the same for now, but note that
  // deleteRecipe uses an ID that might need to be adjusted based on what's available.
  // We'll use idExterne for now.
  const createRecipe = async (recipeData) => {
    try {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      // This endpoint expects the bucket file ID. We assume idExterne can be used.
      const response = await fetch(`/api/bucket/test-delete-by-id/${fileId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }
      setRecipes(prev => prev.filter(recipe => recipe.id !== fileId));
    } catch (err) {
      throw new Error('Erreur lors de la suppression: ' + err.message);
    }
  };

  /**
   * --- NEW TRANSFORM FUNCTION ---
   * This function is adapted to the new JSON structure from the public search.
   * { "studentUploadReadingDTOS": [ ... ] }
   */
  const transformPublicBucketDataToRecipes = (bucketData) => {
    // The data is now in the `studentUploadReadingDTOS` array.
    if (!bucketData || !Array.isArray(bucketData.studentUploadReadingDTOS)) {
      return [];
    }

    return bucketData.studentUploadReadingDTOS.map(file => ({
      // Use idExterne as the unique identifier for keys and deletion.
      id: file.idExterne,
      // Use tag2 as the primary source for the title.
      title: file.tag2 || 'Recette sans nom',
      // The PDF URL is now provided directly by the API.
      pdfUrl: file.url,
      // Fallback descriptions based on tags.
      description: `PDF généré - ${file.tag3}`,
      ingredients: file.tag1 || 'Type non disponible',
      // Keep other fields consistent for the UI.
      createdBy: 'Utilisateur', // This info is not in the public response.
      createdAt: file.tag3 || new Date().toISOString(), // Use tag3 as date if available.
      fileName: file.url.substring(file.url.lastIndexOf('/') + 1), // Extract filename from URL.
      source: 'bucket-public',
      // Add all tags for potential future use.
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