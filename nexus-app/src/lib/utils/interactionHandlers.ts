export const makeBranchHandler = (
  createBranch: (parentId: string, content: string) => Promise<void>,
  optionalRefresh?: () => Promise<void>
) => {
  return async (parentId: string, content: string) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Branch] → create', { parentId, content });
    }

    try {
      // Create the branch first
      await createBranch(parentId, content);
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Branch] ✓ created, starting optional refresh');
      }
      
      // If refresh is provided, await it so the UI doesn't resolve prematurely
      if (optionalRefresh) {
        await optionalRefresh();
        if (process.env.NODE_ENV !== 'production') {
          console.log('[Branch] ✓ refresh completed');
        }
      }
      
      // Add explicit success logging before Promise resolves
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Branch] ✓ makeBranchHandler resolving Promise to UI');
      }
      
      // Explicitly return void to ensure Promise resolves
      return Promise.resolve();
      
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[Branch] ✗ operation failed:', err);
      }
      throw err; // Re-throw to let the UI handle the error
    }
  };
}; 