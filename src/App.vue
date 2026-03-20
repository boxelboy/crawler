<script setup>
import { ref } from "vue";

const url = ref("");
const loading = ref(false);
const result = ref(null);
const error = ref("");

async function crawl() {
  error.value = "";
  result.value = null;
  loading.value = true;
  try {
    const res = await fetch("http://localhost:3050/api/crawl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.value, maxPages: 100 })
    });
    if (!res.ok) throw new Error(await res.text());
    result.value = await res.json();
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <form @submit.prevent="crawl">
    <input v-model="url" type="url" placeholder="https://example.com" required />
    <button :disabled="loading">{{ loading ? "Crawling..." : "Crawl & Screenshot" }}</button>
  </form>

  <p v-if="error" style="color: red">{{ error }}</p>
  <pre v-if="result">{{ result }}</pre>
</template>
