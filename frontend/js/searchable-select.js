// Language: JavaScript (runs in the browser)
// A lightweight "type to search" dropdown — like a combobox. Typing filters
// the list live; clicking an option selects it. Built from scratch (no
// external library needed) so it stays dependency-free and fast.
//
// Usage:
//   const control = createSearchableSelect({ inputEl, hiddenEl, dropdownEl, onChange });
//   control.setOptions([{ id: '1', label: 'Greater Accra' }], 'Select region');
//   control.getValue()  -> the selected id (or '' if nothing selected)
//   control.disable() / control.enable() / control.clear()

function createSearchableSelect({ inputEl, hiddenEl, dropdownEl, onChange }) {
  let options = [];
  let visibleOptions = [];

  function renderDropdown(filterText) {
    const lower = filterText.toLowerCase();
    visibleOptions = options.filter(o => o.label.toLowerCase().includes(lower));

    dropdownEl.innerHTML = visibleOptions.length
      ? visibleOptions.map(o => {
          const isSelected = o.id === hiddenEl.value && o.id !== '';
          return `<div class="searchable-option${isSelected ? ' selected' : ''}" data-id="${o.id}">${o.label}</div>`;
        }).join('')
      : '<div class="searchable-empty">No matches</div>';

    dropdownEl.style.display = 'block';
  }

  function hideDropdown() {
    dropdownEl.style.display = 'none';
  }

  function selectOption(option) {
    hiddenEl.value = option ? option.id : '';
    inputEl.value = option ? option.label : '';
    hideDropdown();
    if (onChange) onChange(hiddenEl.value);
  }

  inputEl.addEventListener('focus', () => renderDropdown(''));
  inputEl.addEventListener('input', () => renderDropdown(inputEl.value));

  inputEl.addEventListener('blur', () => {
    // Delay so a click on an option registers before we validate/close
    setTimeout(() => {
      hideDropdown();
      const typedMatchesAnOption = options.some(o => o.label === inputEl.value);
      if (!typedMatchesAnOption) {
        // Revert to the last real selection, or clear if there wasn't one
        const current = options.find(o => o.id === hiddenEl.value);
        inputEl.value = current ? current.label : '';
        if (!current) hiddenEl.value = '';
      }
    }, 150);
  });

  dropdownEl.addEventListener('mousedown', (e) => {
    const target = e.target.closest('.searchable-option');
    if (!target) return;
    const id = target.getAttribute('data-id');
    const option = visibleOptions.find(o => o.id === id);
    selectOption(option);
  });

  return {
    setOptions(newOptions, placeholderText) {
      options = newOptions;
      inputEl.value = '';
      hiddenEl.value = '';
      if (placeholderText) inputEl.placeholder = placeholderText;
    },
    enable() {
      inputEl.disabled = false;
    },
    disable() {
      inputEl.disabled = true;
      inputEl.value = '';
      hiddenEl.value = '';
    },
    clear() {
      selectOption(null);
    },
    getValue() {
      return hiddenEl.value;
    },
    getLabel() {
      return inputEl.value;
    },
  };
}
