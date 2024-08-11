
window.addEventListener("load", function() {

        // Handle 'crum-page' class.
        var els = document.getElementsByClassName('crum-page');
        Array.prototype.forEach.call(els, function(btn) {
            btn.classList.add('link');
            btn.onclick = () => {
                document.getElementById('crum' + btn.innerHTML.slice(0, -1)).scrollIntoView();
            }
        });

        // Handle 'crum-page-external' class.
        var els = document.getElementsByClassName('crum-page-external');
        Array.prototype.forEach.call(els, function(btn) {
            btn.classList.add('link');
            btn.onclick = () => {
                window.open(
                    'https://coptot.manuscriptroom.com/crum-coptic-dictionary/?docID=800000&pageID='
                    + btn.innerHTML, '_blank').focus();
            }
        });

        // Handle 'coptic' class.
        var els = document.getElementsByClassName('coptic');
        Array.prototype.forEach.call(els, function(btn) {
            btn.classList.add('hover-link');
            btn.onclick = () => {
                window.open(
                    'https://coptic-dictionary.org/results.cgi?quick_search='
                    + btn.innerHTML, '_blank').focus();
            }
        });

        // Handle 'greek' class.
        var els = document.getElementsByClassName('greek');
        Array.prototype.forEach.call(els, function(btn) {
            btn.classList.add('link');
            btn.classList.add('light');
            btn.onclick = () => {
                window.open(
                    'https://logeion.uchicago.edu/'
                    + btn.innerHTML, '_blank').focus();
            }
        });

        // Handle 'dawoud' class.
        var els = document.getElementsByClassName('dawoud');
        Array.prototype.forEach.call(els, function(btn) {
            btn.classList.add('link');
            btn.onclick = () => {
                document.getElementById('dawoud' + btn.innerHTML.slice(0, -1)).scrollIntoView();
            }
        });

        // Handle the 'dialect' class.
        const dialects = ['S', 'Sa', 'Sf', 'A', 'sA', 'B', 'F', 'Fb', 'O', 'NH'];
        const dialectStyle = new Map();
        dialects.forEach((d) => {
            dialectStyle.set(d, 'normal');
        });
        function toggle(d) {
            dialectStyle.set(
                d,
                dialectStyle.get(d) == 'normal' ? 'bold' : 'normal');
        }
        function shouldBold(el) {
          for (var i in dialects) {
            if (dialectStyle.get(dialects[i]) == 'bold' &&
              el.classList.contains(dialects[i])) {
              return true;
            }
          }
          return false;
        }
        function dialected(el) {
          return dialects.some((d) => {
              return el.classList.contains(d);
          });
        }
        var els = document.getElementsByClassName('dialect');
        function dialect(d) {
            toggle(d);
            document.querySelectorAll('.word').forEach((el) => {
                if (!dialected(el)) {
                    return;
                }
                if (shouldBold(el)) {
                    el.classList.remove('very-light');
                    el.classList.add('bold');
                } else {
                    el.classList.remove('bold');
                    el.classList.add('very-light');
                }
            });
            navigateQuery = "?d=" + dialects.filter((d) => {
                return dialectStyle.get(d) == 'bold'; }).join(',');
            document.querySelectorAll('.navigate').forEach((el) => {
                let url = new URL(el.getAttribute('href'));
                url.searchParams.delete('d');
                el.setAttribute('href', url.toString() + navigateQuery);
                });
        }
        Array.prototype.forEach.call(els, (btn) => {
            btn.classList.add('hover-link');
            btn.onclick = () => { dialect(btn.innerHTML); };
        });
        (new URLSearchParams(window.location.search)).get('d').split(',').forEach(
                 dialect);

})
