# vue-pdf
vue.js pdf viewer is a package for Vue that enables you to display and view PDF's easily via vue components. Based on PDFJS.dist.

## Install via NPM
```bash
npm install @kinfo-dev/vue-pdf
```

## Example - basic
```vue
<template>
  <vue-pdf src="./path/to/static/relativity.pdf"></vue-pdf>
</template>

<script>
import {VuePdf} from "@kinfo-dev/vue-pdf";

export default {
  components: {
    VuePdf
  }
}
```

## Browser support
Same browser support as [Vue.js 2](https://github.com/vuejs/vue/blob/dev/README.md)

## API

### Props

#### :src <sup>String / Object - default: ''<sup>
The url of the given pdf. `src` may also be a `string|TypedArray|DocumentInitParameters|PDFDataRangeTransport` for more details, see [`PDFJS.getDocument()`](https://github.com/mozilla/pdf.js/blob/8ff1fbe7f819513e7d0023df961e3d223b35aefa/src/display/api.js#L117).

#### :page <sup>Number - default: 1<sup>
The page number to display.

#### :rotate <sup>Number - default: 0<sup>
The page rotation in degrees, only multiple of 90 are valid.
EG: 90, 180, 270, 360, ...

### Events

#### @password <sup>(updatePassword, reason)<sup>
  * `updatePassword`: The function to call with the pdf password.
  * `reason`: the reason why this function is called `'NEED_PASSWORD'` or `'INCORRECT_PASSWORD'`

#### @progress <sup>Number<sup>
Document loading progress. Range [0, 1].

#### @loaded
Triggers when the document is loaded.

#### @page-loaded <sup>Number<sup>
Triggers when a page is loaded.

#### @num-pages <sup>Number<sup>
The sum of all pages from the given pdf.

#### @error <sup>Object<sup>
Triggers when an error occurs.

#### @link-clicked <sup>Number<sup>
Triggers when an internal link is clicked


### Public methods

#### print(dpi, pageList) * _experimental_ *
  * `dpi`: the print resolution of the document (try 100).
  * `pageList`: the list (array) of pages to print.

### Public static methods

#### createLoadingTask(src[, options])
  * `src`: see `:src` prop  
  * `options`: an object of options. 
  This function creates a PDFJS loading task that can be used and reused as `:src` property.  
  The loading task is a promise that resolves with the PDFJS pdf document that exposes the `numPages` property (see example below).
  
  **beware:** when the component is destroyed, the object returned by `createLoadingTask()` become invalid. 
  
  Supported options:
  * onPassword: Callback that's called when a password protected PDF is being opened.
  * onProgress: Callback return loading progress.
  * withCredentials: Wheter or not to send cookies in the fetch request.


## Examples

##### Example - current page / page count
```vue
<template>
	<div>
		{{currentPage}} / {{pageCount}}
		<vue-pdf
			src="https://cdn.mozilla.net/pdfjs/tracemonkey.pdf"
			@num-pages="pageCount = $event"
			@page-loaded="currentPage = $event"
		></vue-pdf>
	</div>
</template>

<script>

import {VuePdf} from "@kinfo-dev/vue-pdf";

export default {
	components: {
      VuePdf
	},
	data() {
		return {
			currentPage: 0,
			pageCount: 0,
		}
	}
}

</script>
```
