document.addEventListener('DOMContentLoaded', function() {
  // Fetch and display the current blog post
  fetch('blogData.json')
      .then(response => response.json())
      .then(data => {
          const homeBlogContent = document.getElementById('homeBlogContent');
          const today = new Date().toISOString().split('T')[0];
          const todayPost = data.find(post => post.date === today);

          if (todayPost) {
              homeBlogContent.innerHTML = `
                  <h3 class="text-xl font-bold mb-2">${todayPost.title}</h3>
                  <p>${todayPost.content}</p>
              `;
          } else {
              homeBlogContent.innerHTML = '<p>No blog post for today.</p>';
          }
      })
      .catch(error => console.error('Error fetching blog content:', error));
});
