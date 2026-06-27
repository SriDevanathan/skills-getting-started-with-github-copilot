document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper to show messages to user
  function showMessage(text, type = 'info') {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove('hidden');
    setTimeout(() => messageDiv.classList.add('hidden'), 5000);
    console.debug('UI message', { text, type });
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      console.debug('fetchActivities: requesting /activities');
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Reset activity select to default option to avoid duplicates
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;
        const participants = details.participants || [];
        const availabilityText = spotsLeft > 0 ? `${spotsLeft} spots left` : "Full";
        const badgeClass = spotsLeft > 0 ? "badge-available" : "badge-full";

        activityCard.innerHTML = `
          <div class="activity-card-header">
            <h4>${name}</h4>
            <span class="activity-badge ${badgeClass}">${availabilityText}</span>
          </div>
          <p>${details.description}</p>
          <div class="activity-meta">
            <p><strong>Schedule:</strong> ${details.schedule}</p>
            <p><strong>Availability:</strong> ${availabilityText}</p>
          </div>
          <div class="participants-card">
            <h5>Participants</h5>
            ${participants.length > 0 ? `
              <ul class="participants-list">
                ${participants.map((participant) => `<li class="participant-row"><span class="participant-email">${participant}</span><button class="participant-remove" data-email="${participant}" title="Unregister participant">🗑️</button></li>`).join("")}
              </ul>
            ` : `<p class="no-participants">No participants yet. Be the first to sign up!</p>`}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Attach remove handlers for participants (with improved UX)
        activityCard.querySelectorAll('.participant-remove').forEach((btn) => {
          btn.addEventListener('click', async (e) => {
            const email = btn.dataset.email;
            // disable button and show a small busy state
            btn.disabled = true;
            const prior = btn.innerHTML;
            btn.innerHTML = '…';
            try {
              const res = await fetch(
                `/activities/${encodeURIComponent(name)}/signup?email=${encodeURIComponent(email)}`,
                { method: 'DELETE' }
              );

              // Try to parse JSON safely
              let result;
              try {
                result = await res.json();
              } catch (parseErr) {
                result = { message: 'No details', detail: null };
              }

              if (res.ok) {
                // Refresh activities to show updated participants and wait for DOM update
                await fetchActivities();
                showMessage(result.message || 'Participant removed', 'success');
              } else {
                showMessage(result.detail || 'Failed to remove participant', 'error');
                btn.disabled = false;
                btn.innerHTML = prior;
              }
            } catch (err) {
              showMessage('Failed to remove participant. Please try again.', 'error');
              console.error('Error removing participant:', err);
              btn.disabled = false;
              btn.innerHTML = prior;
            }
          });
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
        console.debug('fetchActivities: updated UI with', Object.keys(activities).length, 'activities');
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission with improved UX
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;
    const submitBtn = signupForm.querySelector('button[type="submit"]');

    if (!activity) {
      showMessage('Please select an activity before signing up.', 'error');
      return;
    }

    submitBtn.disabled = true;
    const priorText = submitBtn.innerHTML;
    submitBtn.innerHTML = 'Signing up...';

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      let result;
      try {
        result = await response.json();
      } catch (parseErr) {
        result = { message: null, detail: null };
      }

      if (response.ok) {
        // Refresh activities list so the new participant appears immediately
        await fetchActivities();
        signupForm.reset();
        showMessage(result.message || 'Signed up successfully', 'success');
      } else {
        showMessage(result.detail || 'An error occurred while signing up', 'error');
      }
    } catch (error) {
      showMessage('Failed to sign up. Please try again.', 'error');
      console.error('Error signing up:', error);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = priorText;
    }
  });

  // Initialize app
  fetchActivities();
});
