// Re-export the canonical router from platform/router. main.js and all
// runtime code consume the platform router; this shim keeps the old
// import surface working and guarantees a single router instance.
export * from "@/platform/router";
export { default } from "@/platform/router";
