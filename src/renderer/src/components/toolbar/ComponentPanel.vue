<template lang="pug">
    ToolPanel
        template(#title) Components
        template(#content)
            .component-library(v-for="library in libraries")
                .library-title {{ library.title }}
                .library-icons(v-for="component in library.components")
                    img.library-icon(
                        :library="library.id"
                        :id="component.id"
                        :src="component.image"
                        :aria-label="component.name"
                        :title="component.name"
                        draggable="true")
</template>

<script setup lang="ts">
import * as vue from "vue"

import ToolPanel from './ToolPanel.vue'

const libraries = vue.ref<ComponentLibrary[]>()

libraries.value = [
    {
        id: 'bondgraph',
        name: 'Bondgraph',
        components: [
            {
                id: 'http://celldl.org/ontologies/bond-graph#ZeroStorageNode',
                name: 'ZeroStorageNode',
                image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMy41ZXgiIGhlaWdodD0iNC4xMTZleCIgcm9sZT0iaW1nIiBmb2N1c2FibGU9ImZhbHNlIiB2aWV3Qm94PSItMzAwLjMzMiAtMTE1Ni4yOTggMTU0Ni45NjQgMTgxOS4zMTIiIHN0eWxlPSJ2ZXJ0aWNhbC1hbGlnbjogLTEuNWV4OyI+PHJlY3QgeD0iLTE4OS44MzUiIHk9Ii0xMDQ1Ljc5NiIgd2lkdGg9IjEzMjUuOTY5IiBoZWlnaHQ9IjE1OTguMzA3IiBmaWxsPSIjRTJGMEQ5IiBzdHJva2U9InJlZCIgc3Ryb2tlLXdpZHRoPSIxMTAuNDk3IiByeD0iMzMxLjQ5MiIvPjxkZWZzPjxwYXRoIGlkPSJNSlgtMS1URVgtSS0xRDQ2MiIgZD0iTTIxIDI4N1EyMSAyOTUgMzAgMzE4VDU1IDM3MFQ5OSA0MjBUMTU4IDQ0MlEyMDQgNDQyIDIyNyA0MTdUMjUwIDM1OFEyNTAgMzQwIDIxNiAyNDZUMTgyIDEwNVExODIgNjIgMTk2IDQ1VDIzOCAyN1QyOTEgNDRUMzI4IDc4TDMzOSA5NVEzNDEgOTkgMzc3IDI0N1E0MDcgMzY3IDQxMyAzODdUNDI3IDQxNlE0NDQgNDMxIDQ2MyA0MzFRNDgwIDQzMSA0ODggNDIxVDQ5NiA0MDJMNDIwIDg0UTQxOSA3OSA0MTkgNjhRNDE5IDQzIDQyNiAzNVQ0NDcgMjZRNDY5IDI5IDQ4MiA1N1Q1MTIgMTQ1UTUxNCAxNTMgNTMyIDE1M1E1NTEgMTUzIDU1MSAxNDRRNTUwIDEzOSA1NDkgMTMwVDU0MCA5OFQ1MjMgNTVUNDk4IDE3VDQ2MiAtOFE0NTQgLTEwIDQzOCAtMTBRMzcyIC0xMCAzNDcgNDZRMzQ1IDQ1IDMzNiAzNlQzMTggMjFUMjk2IDZUMjY3IC02VDIzMyAtMTFRMTg5IC0xMSAxNTUgN1ExMDMgMzggMTAzIDExM1ExMDMgMTcwIDEzOCAyNjJUMTczIDM3OVExNzMgMzgwIDE3MyAzODFRMTczIDM5MCAxNzMgMzkzVDE2OSA0MDBUMTU4IDQwNEgxNTRRMTMxIDQwNCAxMTIgMzg1VDgyIDM0NFQ2NSAzMDJUNTcgMjgwUTU1IDI3OCA0MSAyNzhIMjdRMjEgMjg0IDIxIDI4N1oiLz48cGF0aCBpZD0iTUpYLTEtVEVYLUktMUQ0NTYiIGQ9Ik0xODQgNjAwUTE4NCA2MjQgMjAzIDY0MlQyNDcgNjYxUTI2NSA2NjEgMjc3IDY0OVQyOTAgNjE5UTI5MCA1OTYgMjcwIDU3N1QyMjYgNTU3UTIxMSA1NTcgMTk4IDU2N1QxODQgNjAwWk0yMSAyODdRMjEgMjk1IDMwIDMxOFQ1NCAzNjlUOTggNDIwVDE1OCA0NDJRMTk3IDQ0MiAyMjMgNDE5VDI1MCAzNTdRMjUwIDM0MCAyMzYgMzAxVDE5NiAxOTZUMTU0IDgzUTE0OSA2MSAxNDkgNTFRMTQ5IDI2IDE2NiAyNlExNzUgMjYgMTg1IDI5VDIwOCA0M1QyMzUgNzhUMjYwIDEzN1EyNjMgMTQ5IDI2NSAxNTFUMjgyIDE1M1EzMDIgMTUzIDMwMiAxNDNRMzAyIDEzNSAyOTMgMTEyVDI2OCA2MVQyMjMgMTFUMTYxIC0xMVExMjkgLTExIDEwMiAxMFQ3NCA3NFE3NCA5MSA3OSAxMDZUMTIyIDIyMFExNjAgMzIxIDE2NiAzNDFUMTczIDM4MFExNzMgNDA0IDE1NiA0MDRIMTU0UTEyNCA0MDQgOTkgMzcxVDYxIDI4N1E2MCAyODYgNTkgMjg0VDU4IDI4MVQ1NiAyNzlUNTMgMjc4VDQ5IDI3OFQ0MSAyNzhIMjdRMjEgMjg0IDIxIDI4N1oiLz48cGF0aCBpZD0iTUpYLTEtVEVYLUktMUQ0NTciIGQ9Ik0yOTcgNTk2UTI5NyA2MjcgMzE4IDY0NFQzNjEgNjYxUTM3OCA2NjEgMzg5IDY1MVQ0MDMgNjIzUTQwMyA1OTUgMzg0IDU3NlQzNDAgNTU3UTMyMiA1NTcgMzEwIDU2N1QyOTcgNTk2Wk0yODggMzc2UTI4OCA0MDUgMjYyIDQwNVEyNDAgNDA1IDIyMCAzOTNUMTg1IDM2MlQxNjEgMzI1VDE0NCAyOTNMMTM3IDI3OVExMzUgMjc4IDEyMSAyNzhIMTA3UTEwMSAyODQgMTAxIDI4NlQxMDUgMjk5UTEyNiAzNDggMTY0IDM5MVQyNTIgNDQxUTI1MyA0NDEgMjYwIDQ0MVQyNzIgNDQyUTI5NiA0NDEgMzE2IDQzMlEzNDEgNDE4IDM1NCA0MDFUMzY3IDM0OFYzMzJMMzE4IDEzM1EyNjcgLTY3IDI2NCAtNzVRMjQ2IC0xMjUgMTk0IC0xNjRUNzUgLTIwNFEyNSAtMjA0IDcgLTE4M1QtMTIgLTEzN1EtMTIgLTExMCA3IC05MVQ1MyAtNzFRNzAgLTcxIDgyIC04MVQ5NSAtMTEyUTk1IC0xNDggNjMgLTE2N1E2OSAtMTY4IDc3IC0xNjhRMTExIC0xNjggMTM5IC0xNDBUMTgyIC03NEwxOTMgLTMyUTIwNCAxMSAyMTkgNzJUMjUxIDE5N1QyNzggMzA4VDI4OSAzNjVRMjg5IDM3MiAyODggMzc2WiIvPjwvZGVmcz48ZyBzdHJva2U9ImN1cnJlbnRDb2xvciIgZmlsbD0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjAiIHRyYW5zZm9ybT0ic2NhbGUoMSwtMSkiPjxnIGRhdGEtbW1sLW5vZGU9Im1hdGgiPjxnIGRhdGEtbW1sLW5vZGU9Im1zdHlsZSIgZmlsbD0iIzAwQjA1MCIgc3Ryb2tlPSIjMDBCMDUwIj48ZyBkYXRhLW1tbC1ub2RlPSJtc3Vic3VwIj48ZyBkYXRhLW1tbC1ub2RlPSJtaSI+PHVzZSBkYXRhLWM9IjFENDYyIiB4bGluazpocmVmPSIjTUpYLTEtVEVYLUktMUQ0NjIiLz48L2c+PGcgZGF0YS1tbWwtbm9kZT0iVGVYQXRvbSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNjA1LDM2Mykgc2NhbGUoMC43MDcpIiBkYXRhLW1qeC10ZXhjbGFzcz0iT1JEIj48ZyBkYXRhLW1tbC1ub2RlPSJtaSI+PHVzZSBkYXRhLWM9IjFENDU2IiB4bGluazpocmVmPSIjTUpYLTEtVEVYLUktMUQ0NTYiLz48L2c+PC9nPjxnIGRhdGEtbW1sLW5vZGU9IlRlWEF0b20iIHRyYW5zZm9ybT0idHJhbnNsYXRlKDYwNSwtMjkyLjIpIHNjYWxlKDAuNzA3KSIgZGF0YS1tangtdGV4Y2xhc3M9Ik9SRCI+PGcgZGF0YS1tbWwtbm9kZT0ibWkiPjx1c2UgZGF0YS1jPSIxRDQ1NyIgeGxpbms6aHJlZj0iI01KWC0xLVRFWC1JLTFENDU3Ii8+PC9nPjwvZz48L2c+PC9nPjwvZz48L2c+PC9zdmc+'
            }
        ]
    }

]
// src="component.image"
//
// id="http://celldl.org/ontologies/bond-graph#ZeroStorageNode"
// title="ZeroStorageNode"
// src="data:image/svg+xml;base64,PHN
// class="library-icon" draggable="true"

interface ComponentTemplate {
    id: string
    name: string
    image: string
}

interface ComponentLibrary {
    id: string
    name: string
    components: ComponentTemplate[]
}



</script>

<style scoped>
.component-library
{
    width: 100px;
    display: flex;
    flex-direction: column;
    border: 1px solid green;
}
.library-title {
    padding: 2px;
    border-bottom: 1px solid green;
    text-align: center;
}
.library-icons
{
    display: flex;
    flex-wrap: wrap;
    overflow-y: auto;
    margin: 2px;
}
.library-icon
{
    width: 45px;
    height: 45px;
    border: 2px solid grey;
    background: lightgrey;
    margin: 0;
    padding: 2px;
}
.library-icon.selected
{
    background: #3584e4;
}
</style>
