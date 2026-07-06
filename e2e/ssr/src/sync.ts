import SyncComponent from "./SyncComponent.svelte";

if (!customElements.get("sync-component") && SyncComponent.element) {
  customElements.define("sync-component", SyncComponent.element);
}

export default SyncComponent;
