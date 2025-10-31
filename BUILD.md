# Prerequisites

- [Node.js](https://nodejs.org/) (version 22+);
- [npm](https://npmjs.com/) (it comes with Node.js);
- [bun](https://bun.com/package-manager) (for package management); and

## Installation

1. **Install Node.js and npm from [here](https://nodejs.org/en/download/package-manager);**
   **Note:** on [Windows](https://en.wikipedia.org/wiki/Microsoft_Windows) on [ARM](https://en.wikipedia.org/wiki/ARM_architecture_family), you can install [Node.js](https://nodejs.org/) using [fnm](https://github.com/Schniz/fnm). However, if you use `fnm install --lts`, it will install the [Intel](https://en.wikipedia.org/wiki/List_of_Intel_processors) version of [Node.js](https://nodejs.org/), which may or may not be what you want. If you want to install the [ARM](https://en.wikipedia.org/wiki/ARM_architecture_family) version of [Node.js](https://nodejs.org/), you should use `fnm install --lts --arch arm64`.

2. **Install bun globally:**

```bash
npm install -g bun
```

# Getting Started

1. **Start the development version of the CellDL Editor:**
   - **Desktop version:**

     ```bash
     bun dev
     ```

   - **Web app version:**

     ```bash
     bun dev:web
     ```

4. **Test the CellDL Editor:**
   - **Desktop version:** the application will open automatically; and
   - **Web app version:** open your browser and navigate to the local development URL (typically http://localhost:5173).

# Available Scripts

| Script         | Description                                                     |
| -------------- | --------------------------------------------------------------- |
| `archive:web`  | Archive the CellDL Editor's Web app                             |
| `build`        | Build the CellDL Editor                                         |
| `build:web`    | Build the CellDL Editor's Web app                               |
| `clean`        | Clean the CellDL Editor's environment                           |
| `dev`          | (Build and) start the CellDL Editor and the CellDL Editor's Web app with hot reload |
| `dev:web`      | (Build and) start the CellDL Editor's Web app with hot reload   |
| `format`       | Format the code                                                 |
| `format:check` | Check code formatting without making changes                    |
| `lint`         | Lint and automatically fix issues                               |
| `release`      | (Build and) release the CellDL Editor for the current platform  |
| `start`        | (Build and) start (the production version of) the CellDL Editor |
| `start:web`    | (Build and) start (the production version of) the CellDL Editor's Web app |
| `version:new`  | Update the version of the CellDL Editor                         |

# Notes

- The CellDL Editor does not, by default, work on [Ubuntu 24.04 LTS](https://en.wikipedia.org/wiki/Ubuntu_version_history#2404) and later (see [here](https://github.com/opencor/webapp/issues/68) for more information), although it can be made to work by running the following command:
  ```bash
  sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0
  ```
