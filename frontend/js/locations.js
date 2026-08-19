// Language: JavaScript (runs in the browser)
// Wires up Region -> University -> Campus cascading logic on top of the
// searchable-select controllers (see searchable-select.js). Campus still
// depends on BOTH region and university together, so switching region
// always resets an invalid campus/university selection.

function setupLocationDropdowns({ regionControl, universityControl, campusControl, onCampusChange }) {
  async function loadRegions() {
    const regions = await apiRequest('/api/locations/regions');
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
    const options = [{ id: '', label: 'All campuses' }, ...campuses.map(c => ({ id: String(c.id), label: c.name }))];
    campusControl.setOptions(options, 'All campuses');
    if (campuses.length > 0) campusControl.enable();
    else campusControl.disable();
    if (onCampusChange) onCampusChange('');
  }

  loadRegions();

  return { loadUniversities, loadCampuses, resetCampus };
}
