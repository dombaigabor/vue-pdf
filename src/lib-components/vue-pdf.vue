<template>
  <span style="position: relative; display: block">
    <canvas style="display: inline-block; width: 100%; height: 100%; vertical-align: top" ref="canvas" />
    <span style="display: inline-block; width: 100%; height: 100%" class="annotationLayer" ref="annotationLayer" />
    <resize-sensor :inital="true" @resize="resize" />
  </span>
</template>

<script lang="ts">
import resizeSensor from "vue-resize-sensor";
import PdfJsWrapper from "@/PdfJsWrapper";
import Vue from "vue";

declare interface VuePdfData {
  pdf: PdfJsWrapper | null;
  canvas?: HTMLCanvasElement;
  annotationLayer?: HTMLSpanElement;
}

export default Vue.extend({
  name: "VuePdf",
  components: {
    resizeSensor
  },
  data: function(): VuePdfData   {
    return {
      pdf: null,
      canvas: undefined,
      annotationLayer: undefined
    }
  },
  props: {
    src: {
      type: [String, Object, Uint8Array],
      default: ""
    },
    page: {
      type: Number,
      default: 1
    },
    rotate: {
      type: Number
    },
  },
  watch: {
    src: function ()  {
      this.pdf?.loadDocument(this.src);
    },
    page: function () {
      this.pdf?.loadPage(this.page, this.rotate);
    },
    rotate: function () {
      this.pdf?.renderPage(this.rotate);
    }
  },
  mounted: function () {
    this.canvas = this.$refs.canvas as HTMLCanvasElement;
    this.annotationLayer = this.$refs.annotationLayer as HTMLSpanElement;
    
    this.pdf = new PdfJsWrapper(this.canvas, this.annotationLayer, this.$emit.bind(this));

    this.$on('loaded', () => {
      this.pdf?.loadPage(this.page, this.rotate);
    });

    this.$on('page-size', (width: number, height: number) => {

      if(this.canvas) {
        this.canvas.style.height = this.canvas.offsetWidth * (height / width) + 'px';
      }
    });

    this.pdf?.loadDocument(this.src);
  },
  destroyed: function () {
    this.pdf?.destroy();
  },
  methods: {
    resize: function (size: any) {
      if (this.$el.parentNode === null || (size.width === 0 && size.height === 0)) {
        return;
      }

      if(this.canvas) {
        this.canvas.style.height = this.canvas.offsetWidth * (this.canvas.height / this.canvas.width) + 'px';
      }
      const resolutionScale = this.pdf?.getResolutionScale();

      if (resolutionScale) {
        if (resolutionScale < 0.85 || resolutionScale > 1.15) {
          this.pdf?.renderPage(this.rotate);
        }
      }
    },
    print: function (dpi: any, pageList: any) {
      this.pdf?.printPage(dpi, pageList);
    }
  }
});
</script>

<style scoped>
.annotationLayer {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
}

.annotationLayer section {
  position: absolute;
}

.annotationLayer .linkAnnotation > a {
  position: absolute;
  font-size: 1em;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.annotationLayer .linkAnnotation > a /* -ms-a */
{
  background: url("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7") 0 0 repeat;
}

.annotationLayer .linkAnnotation > a:hover {
  opacity: 0.2;
  background: #ff0;
  box-shadow: 0 2px 10px #ff0;
}

.annotationLayer .textAnnotation img {
  position: absolute;
  cursor: pointer;
}

.annotationLayer .textWidgetAnnotation input,
.annotationLayer .textWidgetAnnotation textarea,
.annotationLayer .choiceWidgetAnnotation select,
.annotationLayer .buttonWidgetAnnotation.checkBox input,
.annotationLayer .buttonWidgetAnnotation.radioButton input {
  background-color: rgba(0, 54, 255, 0.13);
  border: 1px solid transparent;
  box-sizing: border-box;
  font-size: 9px;
  height: 100%;
  padding: 0 3px;
  vertical-align: top;
  width: 100%;
}

.annotationLayer .textWidgetAnnotation textarea {
  font: message-box;
  font-size: 9px;
  resize: none;
}

.annotationLayer .textWidgetAnnotation input[disabled],
.annotationLayer .textWidgetAnnotation textarea[disabled],
.annotationLayer .choiceWidgetAnnotation select[disabled],
.annotationLayer .buttonWidgetAnnotation.checkBox input[disabled],
.annotationLayer .buttonWidgetAnnotation.radioButton input[disabled] {
  background: none;
  border: 1px solid transparent;
  cursor: not-allowed;
}

.annotationLayer .textWidgetAnnotation input:hover,
.annotationLayer .textWidgetAnnotation textarea:hover,
.annotationLayer .choiceWidgetAnnotation select:hover,
.annotationLayer .buttonWidgetAnnotation.checkBox input:hover,
.annotationLayer .buttonWidgetAnnotation.radioButton input:hover {
  border: 1px solid #000;
}

.annotationLayer .textWidgetAnnotation input:focus,
.annotationLayer .textWidgetAnnotation textarea:focus,
.annotationLayer .choiceWidgetAnnotation select:focus {
  background: none;
  border: 1px solid transparent;
}

.annotationLayer .textWidgetAnnotation input.comb {
  font-family: monospace;
  padding-left: 2px;
  padding-right: 0;
}

.annotationLayer .textWidgetAnnotation input.comb:focus {
  /*
   * Letter spacing is placed on the right side of each character. Hence, the
   * letter spacing of the last character may be placed outside the visible
   * area, causing horizontal scrolling. We avoid this by extending the width
   * when the element has focus and revert this when it loses focus.
   */
  width: 115%;
}

.annotationLayer .buttonWidgetAnnotation.checkBox input,
.annotationLayer .buttonWidgetAnnotation.radioButton input {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
}

.annotationLayer .popupWrapper {
  position: absolute;
  width: 20em;
}

.annotationLayer .popup {
  position: absolute;
  z-index: 200;
  max-width: 20em;
  background-color: #FFFF99;
  box-shadow: 0 2px 5px #333;
  border-radius: 2px;
  padding: 0.6em;
  margin-left: 5px;
  cursor: pointer;
  word-wrap: break-word;
}

.annotationLayer .popup h1 {
  font-size: 1em;
  border-bottom: 1px solid #000000;
  padding-bottom: 0.2em;
}

.annotationLayer .popup p {
  padding-top: 0.2em;
}

.annotationLayer .highlightAnnotation,
.annotationLayer .underlineAnnotation,
.annotationLayer .squigglyAnnotation,
.annotationLayer .strikeoutAnnotation,
.annotationLayer .lineAnnotation svg line,
.annotationLayer .fileAttachmentAnnotation {
  cursor: pointer;
}

</style>
