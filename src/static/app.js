document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities", { cache: 'no-store' });
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

        const list = document.createElement("ul");
        list.className = "participants-list";

        const participants = Array.isArray(details.participants) ? details.participants : [];

        if (participants.length === 0) {
          const empty = document.createElement("div");
          empty.className = "participant-empty";
          empty.textContent = "No participants yet";
          list.appendChild(empty);
        } else {
          participants.forEach((part) => {
            // support either a string (email) or object { name, email }
            const info = typeof part === "string" ? { name: null, email: part } : part;
            const label = info.name || info.email || "Participant";
            const emailAddress = info.email || info.name || "";

            const li = document.createElement("li");
            li.className = "participant-item";

            const nameSpan = document.createElement("span");
            nameSpan.className = "participant-name";
            nameSpan.textContent = label;

            const removeBtn = document.createElement("button");
            removeBtn.className = "participant-remove";
            removeBtn.textContent = "✕";
            removeBtn.title = `Remove ${label}`;

            removeBtn.addEventListener("click", async () => {
              if (!confirm(`Remove ${label} from ${name}?`)) return;
              await removeParticipantRequest(name, emailAddress);
            });

            li.appendChild(nameSpan);
            li.appendChild(removeBtn);
            list.appendChild(li);
          });
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

  // Helper: send DELETE to remove participant and refresh UI
  async function removeParticipantRequest(activityName, email) {
    try {
      const res = await fetch(`/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`, { method: "DELETE" });
      const result = await res.json();
      if (res.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        messageDiv.classList.remove("hidden");
        setTimeout(() => messageDiv.classList.add("hidden"), 5000);
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
        messageDiv.classList.remove("hidden");
      }
    } catch (error) {
      messageDiv.textContent = "Failed to remove participant. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error removing participant:", error);
    }
  }

  // Helper: optimistically update the participants list in the DOM
  function addParticipantToDOM(activityName, email) {
    const cards = document.querySelectorAll(".activity-card");
    for (const card of cards) {
      const titleEl = card.querySelector("h4");
      if (!titleEl || titleEl.textContent !== activityName) continue;
      const list = card.querySelector(".participants-list");
      if (!list) return;
      const empty = list.querySelector(".participant-empty");
      if (empty) empty.remove();

      // Avoid duplicates
      const exists = Array.from(list.querySelectorAll(".participant-name")).some((n) => n.textContent === email);
      if (exists) return;

      const li = document.createElement("li");
      li.className = "participant-item";

      const nameSpan = document.createElement("span");
      nameSpan.className = "participant-name";
      nameSpan.textContent = email;

      const removeBtn = document.createElement("button");
      removeBtn.className = "participant-remove";
      removeBtn.textContent = "✕";
      removeBtn.title = `Remove ${email}`;

      removeBtn.addEventListener("click", async () => {
        if (!confirm(`Remove ${email} from ${activityName}?`)) return;
        await removeParticipantRequest(activityName, email);
      });

      li.appendChild(nameSpan);
      li.appendChild(removeBtn);
      list.appendChild(li);

      // Update availability text if present
      const avail = Array.from(card.querySelectorAll("p")).find((p) => p.textContent.includes("Availability:"));
      if (avail) {
        const m = avail.textContent.match(/(\d+)\s+spots/);
        if (m) {
          const cur = parseInt(m[1], 10);
          if (cur > 0) {
            avail.textContent = `Availability: ${cur - 1} spots left`;
          }
        }
      }

      break;
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

        // Optimistically update UI immediately and then refresh from server
        addParticipantToDOM(activity, email);
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
