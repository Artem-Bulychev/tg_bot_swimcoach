<template>
  <div class="overflow-x-auto">
    <table class="min-w-full table-auto border">
      <thead>
      <tr class="bg-gray-200">
        <th class="px-4 py-2">ID</th>
        <th class="px-4 py-2">Цель</th>
        <th class="px-4 py-2">День</th>
        <th class="px-4 py-2">Премиум</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="user in users" :key="user._id" class="border-b">
        <td class="px-4 py-2">{{ user.chatId }}</td>
        <td class="px-4 py-2">{{ user.goal }}</td>
        <td class="px-4 py-2">{{ user.dayIndex }}</td>
        <td class="px-4 py-2">{{ user.premium ? 'Да' : 'Нет' }}</td>
      </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const users = ref([])

onMounted(async () => {
  const res = await axios.get('http://localhost:3000/api/users')
  users.value = res.data
})
</script>