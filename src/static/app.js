document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Reset select to avoid duplicates on re-fetch
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;

        // Participants section
        const participantsSection = document.createElement("div");
        participantsSection.className = "participants-section";

        const title = document.createElement("div");
        title.className = "participants-title";
        title.textContent = "Participants";

        const list = document.createElement("div");
        list.className = "participants-list";

        const participants = Array.isArray(details.participants) ? details.participants : [];

        if (participants.length === 0) {
          const empty = document.createElement("div");
          empty.className = "participant-empty";
          empty.textContent = "No participants yet";
          list.appendChild(empty);
        } else {
          // Show up to 5 badges, then a +N badge if needed
          const maxBadges = 5;
          participants.slice(0, maxBadges).forEach((part) => {
            // support either a string (email) or object { name, email }
            const info = typeof part === "string" ? { name: null, email: part } : part;
            const label = info.name || info.email || "Participant";
            const initialsSource = info.name || info.email || "";
            const initials = initialsSource
              .split(/[\s@.]+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((s) => s[0].toUpperCase())
              .join("")
              .substring(0, 2);

            const badge = document.createElement("span");
            badge.className = "participant-badge";
            badge.textContent = initials || "?";
            badge.title = label;
            list.appendChild(badge);
          });

          if (participants.length > maxBadges) {
            const more = document.createElement("span");
            more.className = "participant-more";
            more.textContent = `+${participants.length - maxBadges}`;
            more.title = `${participants.length} participants`;
            list.appendChild(more);
          }
        }

        participantsSection.appendChild(title);
        participantsSection.appendChild(list);
        activityCard.appendChild(participantsSection);

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities to show updated participants & spots
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
