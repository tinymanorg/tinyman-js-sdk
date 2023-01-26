
## Working with the local copy of the sdk

1. After making changes on the local clone of the repo, get a build:

   ```sh
   npm run build
   ```

2. Add the new build as a dependency to your project, in `package.json`:

   ```json
   "dependencies": {
     "@tinymanorg/tinyman-js-sdk": "../tinyman-js-sdk",
   }
   ```

   You should replace `"../tinyman-js-sdk"` part with the relative path to the local clone of the repo.

3. Install the dependencies:

   ```sh
   npm install
   ```

4. Then start your project, and test it.
5. Remember to repeat step 1 to get a new build after you make any changes on the sdk code.

<hr>

