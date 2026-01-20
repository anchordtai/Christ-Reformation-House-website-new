document.addEventListener('DOMContentLoaded', function() {
  // Fetch and display the current blog post
  fetch('blogData.json')
      .then(response => response.json())
      .then(data => {
          const blogContent = document.getElementById('blogContent');
          const today = new Date().toISOString().split('T')[0];
          const todayPost = data.find(post => post.date === today);
          
          if (todayPost) {
              blogContent.innerHTML = `
                  <h2 class="text-2xl font-bold mb-4">${todayPost.title}</h2>
                  ${todayPost.content}
                  <div class="mt-4 addthis_inline_share_toolbox"></div>
              `;
              // Initialize AddThis buttons
              addthis.toolbox('.addthis_inline_share_toolbox');
          } else {
              blogContent.innerHTML = '<p>No blog post for today.</p>';
          }

          // Display previous posts, filtering out future posts
          const previousPosts = data.filter(post => post.date < today);
          const previousPostsList = document.getElementById('previousPosts');
          previousPosts.forEach(post => {
              const listItem = document.createElement('li');
              listItem.innerHTML = `<a href="#" class="text-blue-600 hover:underline">${post.title}</a>`;
              previousPostsList.appendChild(listItem);
          });
      })
      .catch(error => console.error('Error fetching blog content:', error));
});
