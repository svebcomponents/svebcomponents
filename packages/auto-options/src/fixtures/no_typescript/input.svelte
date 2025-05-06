<script>
  let {
    myNumber,
    ...rest
  } = $props();
</script>
<h1>{myNumber}{rest}</h1>
