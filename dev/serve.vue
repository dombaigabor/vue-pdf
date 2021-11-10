<template>
  <div>
    <vue-pdf src="dummy.pdf" />
  </div>
</template>

<script lang="ts">
import VuePdf from "../src/components/vue-pdf.vue"
import {Component, Vue} from "vue-property-decorator";

@Component({components: {VuePdf}})
export default class Serve extends Vue{

};
</script>