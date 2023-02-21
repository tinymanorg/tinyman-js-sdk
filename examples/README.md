# Tinyman JS SDK Examples

This is a collection of node scripts that uses tinyman-js-sdk v2 operations.

⚠️ Please be aware that the scripts are not production-ready, and are only for testing purposes. If you plan to use the scripts in production, please make sure to test and optimize them for your use case.

### File/Folder Structure

- `operation` folder includes scripts that perform operations on the pool. **If you only want to see a specific operation example, you can check the files in this folder.**
- `util` folder includes helper functions or constant variables that are used in the test scripts
- `index.ts` includes a `main` function that runs all of the operations in order;
  1. Create an account and two assets (for testing purposes)
  2. (Bootstrap) Create the pool with owned assets
  3. (Add Liquidity) Adds liquidity to the pool
  4. (Remove Liquidity) Take out some of the owned liquidity from the pool
  5. (Swap) Swap one of the assets for the other

For easier testing, on the first run, `main` function creates an account and two assets (for testing purposes). The account will initiator of the operations, and the asset pair will be used for creating the pool.

### Running the test script

1. First, install the dependencies

   ```sh
   npm install
   ```

2. Then run the script:
   ```sh
   npm run start
   ```
