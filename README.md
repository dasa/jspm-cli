# jspm 3.0

ES Module Package Management

**In-Progress Pre-Release. DO NOT SHARE.**

### Getting Started

See the getting started guide at https://jspm.org/cli.

## Contributing

**Seeking contributors**

The project is still under heavy development, and the codebase reflects this in being very rough.

Fixing bugs, improving the test coverage and code quality or suggesting your own additions are all a huge help.

## Building

```
npm run build-node
```

builds `dist/index.js` which is the main CLI executable.

Setup a symlink to this file in your PATH to get a live build running locally.

For a watched build run

```
npm run watch-build-node
```

this is useful during development for faster rebuilds.

```
npm run build-browser
```

creates a `lib` folder with a version of jspm that can execute in the browser (when itself in turn installed with jspm).

## Tests

```
npm run test
```

Tests require Node.js 12.17+ with ES modules support.

### License

Apache-2.0
