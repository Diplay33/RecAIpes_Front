import { useState, useEffect, useCallback } from 'react';
import { recipeApi } from '../services/api';

export const useRecipes = () => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadRecipes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await recipeApi.getAllRecipes();
      setRecipes(response.data);
      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement des recettes');
    } finally {
      setLoading(false);
    }
  }, []);

  const createRecipe = async (recipeData) => {
    try {
      const response = await recipeApi.createRecipe(recipeData);
      setRecipes(prev => [...prev, response.data]);
      return response.data;
    } catch (err) {
      throw new Error('Erreur lors de la création');
    }
  };

  const deleteRecipe = async (id) => {
    try {
      await recipeApi.deleteRecipe(id);
      setRecipes(prev => prev.filter(recipe => recipe.id !== id));
    } catch (err) {
      throw new Error('Erreur lors de la suppression');
    }
  };

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  return {
    recipes,
    loading,
    error,
    loadRecipes,
    createRecipe,
    deleteRecipe
  };
};
