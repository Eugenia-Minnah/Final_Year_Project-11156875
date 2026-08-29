// Language: JavaScript (runs in the browser)
// Powers the campus search in the landing page hero — this is the actual
// differentiating feature of the whole product (real calculated distance
// from a student's own campus, not just a generic hostel list). Submitting
// this form takes the student straight into explore.html with their
// selection already applied, so the very first result they see is a real
// distance number — not an empty search form they have to fill in again.

const regionControl = createSearchableSelect({
  inputEl: document.getElementById('regionInput'),
  hiddenEl: document.getElementById('regionInputValue'),
  dropdownEl: document.getElementById('regionInputDropdown'),
  onChange: (regionId) => locationController.loadUniversities && locationController.loadUniversities(regionId),
});

const universityControl = createSearchableSelect({
  inputEl: document.getElementById('universityInput'),
  hiddenEl: document.getElementById('universityInputValue'),
  dropdownEl: document.getElementById('universityInputDropdown'),
  onChange: (universityId) => locationController.loadCampuses && locationController.loadCampuses(universityId, regionControl.getValue()),
});

const campusControl = createSearchableSelect({
  inputEl: document.getElementById('campusInput'),
  hiddenEl: document.getElementById('campusInputValue'),
  dropdownEl: document.getElementById('campusInputDropdown'),
});

let locationController = setupLocationDropdowns({ regionControl, universityControl, campusControl });

document.getElementById('heroSearchForm').addEventListener('submit', (e) => {
  e.preventDefault();

  const regionId = regionControl.getValue();
  const universityId = universityControl.getValue();
  const campusId = campusControl.getValue();

  if (!regionId) {
    alert('Select a region to see hostels near your campus — or use "browse every hostel" below if you\'d rather not pick one.');
    return;
  }

  const params = new URLSearchParams();
  if (regionId) params.set('regionId', regionId);
  if (universityId) params.set('universityId', universityId);
  if (campusId) params.set('campusId', campusId);

  window.location.href = 'explore.html?' + params.toString();
});
