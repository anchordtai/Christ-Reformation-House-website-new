document.addEventListener('DOMContentLoaded', function() {
  // Fetch and display the current blog post
  fetch('devotionalData.json')
      .then(response => response.json())
      .then(data => {
          const homeDevotionalContent = document.getElementById('homeDevotionalContent');
          const today = new Date().toISOString().split('T')[0];
          const todayPost = data.find(post => post.date === today);

          if (todayPost) {
              homeDevotionalContent.innerHTML = `
                  <h3 class="text-xl font-bold mb-2">${todayPost.title}</h3>
                  <p>${todayPost.content}</p>
              `;
          } else {
              homeDevotionalContent.innerHTML = '<p>No blog post for today.</p>';
          }
      })
      .catch(error => console.error('Error fetching blog content:', error));
});
