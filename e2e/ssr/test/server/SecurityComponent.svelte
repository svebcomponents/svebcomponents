<script lang="ts">
  // import & register web component
  import "../../dist/client/index.js";

  interface Props {
    attributePayload?: string;
    content: string;
    title: string;
  }

  let { title, attributePayload = title, content }: Props = $props();
</script>

<simple-component {title} data-test={attributePayload}>
  {content}
</simple-component>
