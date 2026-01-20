# The CellDL Editor

There are two versions of the Editor:

1. **The CellDL Editor:** a desktop application that can be run on [Intel](https://en.wikipedia.org/wiki/List_of_Intel_processors)-based and [ARM](https://en.wikipedia.org/wiki/ARM_architecture_family)-based [Windows](https://en.wikipedia.org/wiki/Microsoft_Windows), [Linux](https://en.wikipedia.org/wiki/Linux), and [macOS](https://en.wikipedia.org/wiki/MacOS) machines; and
2. **The CellDL Editor's Web app:** a [Web app](https://en.wikipedia.org/wiki/Web_application) that can be run on a Web browser.

This package is a [Vue 3](https://vuejs.org/) component for the CellDL Editor, built with the [Composition API](https://vuejs.org/guide/extras/composition-api-faq).

## Usage

The component comes with the following props:

| Name    | Type                                       | Default    | Description                                                                      |
| ------- | ------------------------------------------ | ---------- | -------------------------------------------------------------------------------- |
| `theme` | String: `'light'`, `'dark'`, or `'system'` | `'system'` | The theme to use. Note that it is set once and for all, i.e. it is not reactive. |

- **index.html:**

The `Content-Security-Policy` **must** allow `data:` connections and Wasm to be evaluated, for instance:

```html
    <meta
      http-equiv="Content-Security-Policy"
      content="connect-src * data:; script-src 'self' 'wasm-unsafe-eval'" />
```

- **main.ts:**

```typescript
import { createApp } from 'vue';

import App from './App.vue';

createApp(App).mount('#app');
```

The Vue component gives access to all of the CellDL Editor's features

- **App.vue:**

```vue
<template>
  <CellDLEditor />
</template>

<script setup lang="ts">
import CellDLEditor from '@abi-software/celldl-editor';
import '@abi-software/celldl-editor/CellDLEditor.css';
</script>
```
