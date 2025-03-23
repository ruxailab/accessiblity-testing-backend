<template>
  <div id="app">
    <nav class="navbar">
      <div class="container">
        <h1 class="navbar-brand">Web Accessibility Checker</h1>
        <div class="nav-links">
          <router-link to="/">Home</router-link>
          <router-link to="/reports">Reports</router-link>
        </div>
      </div>
    </nav>
    
    <div class="container">
      <router-view />
    </div>
  </div>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style>
* {
  box-sizing: border-box;
}

body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 0;
  background-color: #f5f5f5;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 15px;
}

.navbar {
  background-color: #333;
  color: white;
  padding: 15px 0;
}

.navbar-brand {
  margin: 0;
}

.nav-links {
  display: flex;
  gap: 15px;
}

.nav-links a {
  color: white;
  text-decoration: none;
}

.nav-links a.router-link-active {
  font-weight: bold;
  text-decoration: underline;
}
</style>
