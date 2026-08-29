// Language: JavaScript (runs in the browser)
// Wires up Region -> University -> Campus cascading logic on top of the
// searchable-select controllers (see searchable-select.js). Campus still
// depends on BOTH region and university together, so switching region
// always resets an invalid campus/university selection.

function setupLocationDropdowns({ regionControl, universityControl, campusControl, onCampusChange }) {
  let lastRegions = [];
  let lastUniversities = [];
  let lastCampuses = [];

  async function loadRegions() {
    const regions = await apiRequest('/api/locations/regions');
    lastRegions = regions;
    regionControl.setOptions(
      regions.map(r => ({ id: String(r.id), label: r.name })),
      'Type or select a region'
    );
  }

  function resetCampus() {
    campusControl.setOptions([{ id: '', label: 'All campuses' }], 'All campuses');
    campusControl.disable();
    if (onCampusChange) onCampusChange('');
  }

  async function loadUniversities(regionId) {
    resetCampus();
    if (!regionId) {
      universityControl.setOptions([], 'Select a region first');
      universityControl.disable();
      return;
    }
    const universities = await apiRequest(`/api/locations/universities?regionId=${regionId}`);
    lastUniversities = universities;
    universityControl.setOptions(
      universities.map(u => ({ id: String(u.id), label: u.name })),
      'Type or select a university'
    );
    if (universities.length > 0) universityControl.enable();
    else universityControl.disable();
  }

  async function loadCampuses(universityId, regionId) {
    if (!universityId || !regionId) {
      resetCampus();
      return;
    }
    const campuses = await apiRequest(`/api/locations/campuses?universityId=${universityId}&regionId=${regionId}`);
    lastCampuses = campuses;
    const options = [{ id: '', label: 'All campuses' }, ...campuses.map(c => ({ id: String(c.id), label: c.name }))];
    campusControl.setOptions(options, 'All campuses');
    if (campuses.length > 0) campusControl.enable();
    else campusControl.disable();
    if (onCampusChange) onCampusChange('');
  }

  // Pre-fills the three dropdowns from known IDs — used when arriving from
  // a link that already specifies a region/university/campus (e.g. the
  // landing page's hero search handing off to explore.html), so the
  // student sees real results immediately instead of an empty search form.
  async function restoreSelection({ regionId, universityId, campusId }) {
    if (!regionId) return;

    await loadRegions();
    const region = lastRegions.find(r => String(r.id) === String(regionId));
    if (!region) return;
    regionControl.selectById(String(regionId), region.name);

    if (!universityId) return;
    await loadUniversities(regionId);
    const university = lastUniversities.find(u => String(u.id) === String(universityId));
    if (!university) return;
    universityControl.selectById(String(universityId), university.name);

    if (!campusId) return;
    await loadCampuses(universityId, regionId);
    const campus = lastCampuses.find(c => String(c.id) === String(campusId));
    if (!campus) return;
    campusControl.selectById(String(campusId), campus.name);
  }

  loadRegions();

  return { loadUniversities, loadCampuses, resetCampus, restoreSelection };
}
