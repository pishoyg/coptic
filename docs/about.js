"use strict";import*as e from"./html.js";import*as r from"./help.js";var s=(t=>(t.CREDITS="Credits",t.WORKS="Cited Works",t.IMAGES="Image Credits",t.LICENSE="License",t.CONTACT="Contact",t.DONATE="Donate",t.CODE="Code",t))(s||{}),n=(a=>(a.CITED_WORKS="cited-works",a.CONTACT="contact",a.DONATE="donate",a.CODE="code",a))(n||{});const l=(o=>e.anchor(`mailto:${o}`,o))("remnqymi@gmail.com").outerHTML,c=`
<p>This work is made possible through the dedication of:</p>

<ul>
  <li>Randy Komforty, creator of <a href="https://coptic.wiki/" target="_blank">CopticWiki</a>.</li>

  <li>Milan Konvicka, creator of <a href="https://marcion.sourceforge.net/" target="_blank">Marcion</a>.</li>

  <li>Dr. Hany Takla, founder of <a href="http://stshenouda.org" target="_blank">St. Shenouda the Archimandrite Coptic Society</a>.</li>
</ul>
`,p=`
<ul>
  <li><em><a href="https://marcion.sourceforge.net/" target="_blank">Marcion</a></em>, by Milan Konvicka.</li>

  <li><em><a href="https://coptic.wiki/" target="_blank">CopticWiki</a></em>, by Randy Komforty.</li>

  <li><em><a href="https://www.coptist.com/2025/07/30/digitised-bibliography-crum/" target="_blank">Digitised bibliography of Crum's "List of Abbreviations"</a></em>, The Coptist.</li>

  <li>
    <em><a href="https://refubium.fu-berlin.de/handle/fub188/27813" target="_blank">Comprehensive Coptic Lexicon</a></em> (<a href="https://aaew.bbaw.de/tla/" target="_blank">BBAW/Thesaurus Linguae Aegyptiae project</a>, <a href="https://dioskoros.org/" target="_blank">FU Berlin/DDGLC project</a>), DOI <a href="https://doi.org/10.17169/refubium-27566" target="_blank">10.17169/refubium-27566</a>.
  </li>

  <li>
    <em><a href="https://coptic-dictionary.org/" target="_blank">Coptic Dictionary Online</a></em>, ed. by the <a href="https://kellia.uni-goettingen.de/" target="_blank">Koptische/Coptic Electronic Language and Literature International Alliance (KELLIA)</a>.
  </li>

  <li>
    <em>\u2CA1\u2C93\u2C81\u2C9B\u2CA5\u2C81\u03EB\u2C93 \u2C9B\u0300\u03EF\u2C81\u2CA5\u2CA1\u2C93 \u2C9B\u0300\u2CA3\u2C89\u2C99\u2C9B\u0300\u2CAD\u2C8F\u2C99\u2C93 | <span dir="rtl">\u0642\u0627\u0645\u0648\u0633 \u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0642\u0628\u0637\u064A\u0629</span></em>, <span dir="rtl">\u0645\u0639\u0648\u0636 \u062F\u0627\u0648\u062F \u0639\u0628\u062F\u0627\u0644\u0646\u0648\u0631</span>, <a href="https://copticocc.org/" target="_blank">The Coptic Orthodox Cultural Center</a>.
  </li>

  <li>
    <em><span dir="rtl">\u0642\u0627\u0645\u0648\u0633 \u0642\u0628\u0637\u064A \u0639\u0631\u0628\u064A \u0644\u0643\u0644\u0645\u0627\u062A \u0627\u0644\u0644\u0647\u062C\u0629 \u0627\u0644\u0628\u062D\u064A\u0631\u064A\u0629</span></em>, <span dir="rtl">\u062F\u064A\u0631 \u0627\u0644\u0642\u062F\u064A\u0633 \u0623\u0646\u0628\u0627 \u0645\u0642\u0627\u0631 \u0628\u0628\u0631\u064A\u0629 \u0634\u064A\u0647\u064A\u062A</span> (<a href="https://stmacariusmonastery.org/?lang=en" target="_blank">Monastery of Saint Macarius the Great</a>).
  </li>

  <li><em><a href="http://www.stshenouda.org/coptic-Bible-app" target="_blank">Coptic Bible App</a></em>, by St. Shenouda the Archimandrite Coptic Society.</li>

  <li><em><a href="https://copticscriptorium.org/" target="_blank">Coptic Scriptorium</a></em>, by Caroline T. Schroeder, Amir Zeldes, et al.</li>

  <li><em><a href="https://coptot.manuscriptroom.com/" target="_blank">Digital Edition of the Coptic Old Testament</a></em>, by the G\xF6ttingen Academy of Sciences and Humanities in Lower Saxony.</li>
</ul>
`,h=`
<ul>
  <li><a href="https://commons.wikimedia.org/" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a>, images by their respective authors, used under their individual licenses (<a href="https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia" target="_blank" rel="noopener noreferrer">reuse policy</a>).</li>

  <li><a href="https://www.flaticon.com/" target="_blank" rel="noopener noreferrer">Flaticon</a>, icons by their respective authors, used under the <a href="https://www.flaticon.com/legal" target="_blank" rel="noopener noreferrer">Flaticon free license</a>.</li>

  <li><a href="https://thenounproject.com/" target="_blank" rel="noopener noreferrer">The Noun Project</a>, icons by their respective creators, used under <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener noreferrer">CC BY 3.0</a>.</li>

  <li><a href="https://www.vecteezy.com/" target="_blank" rel="noopener noreferrer">Vecteezy</a>, images by their respective contributors, used under the <a href="https://www.vecteezy.com/licensing-agreement" target="_blank" rel="noopener noreferrer">Vecteezy free license</a>.</li>

  <li><a href="https://www.freepik.com/" target="_blank" rel="noopener noreferrer">Freepik</a>, images by their respective authors, used under the <a href="https://www.freepik.com/legal/terms-of-use" target="_blank" rel="noopener noreferrer">Freepik free license</a>.</li>

  <li><a href="https://uxwing.com/" target="_blank" rel="noopener noreferrer">UXWing</a>, icons used under the <a href="https://uxwing.com/license/" target="_blank" rel="noopener noreferrer">UXWing license</a>.</li>

  <li><a href="https://www.svgrepo.com/" target="_blank" rel="noopener noreferrer">SVG Repo</a>, icons used under their individual licenses (<a href="https://www.svgrepo.com/page/licensing/" target="_blank" rel="noopener noreferrer">licensing</a>).</li>
</ul>
`,g=`
<ul>
  <li>Email us at \u{1F4E7} ${l}.</li>

  <li>File a <a href="https://github.com/pishoyg/coptic/issues/new" target="_blank" rel="noopener noreferrer">ticket</a> or a <a href="https://docs.google.com/forms/d/e/1FAIpQLSeNVAjxtJcAR7i6AwBI3SFlzRWC5DQ09G6LfbySbZGvZCdpIg/viewform?usp=pp_url&amp;entry.1382006920=http://remnqymi.com/" target="_blank" rel="noopener noreferrer">report</a>.</li>
</ul>

<p>Feedback is appreciated.</p>
`,m=`
<p>You can support <a href="https://coptic.wiki/" target="_blank" rel="noopener noreferrer">CopticWiki</a>, who provide Lexicon data, through:</p>

<ul>
  <li><a href="https://www.patreon.com/c/CopticWiki/posts" target="_blank" rel="noopener noreferrer">Patreon <img class="inline-logo" alt="Patreon" src="/img/logos/patreon.png"></a></li>

  <li><a href="https://buymeacoffee.com/copticwiki" target="_blank" rel="noopener noreferrer">Buy Me a Coffee <img class="inline-logo" alt="Buy Me a Coffee" src="/img/logos/buy-me-a-coffee.png"></a></li>

  <li><a href="https://ko-fi.com/copticwiki" target="_blank" rel="noopener noreferrer">Ko-fi <img class="inline-logo" alt="Ko-fi" src="/img/logos/ko-fi.png"></a></li>
</ul>

<p>Please also consider donating to <a href="https://copticorphans.org/" target="_blank" rel="noopener noreferrer">Coptic Orphans <img class="inline-logo" alt="Coptic Orphans" src="/img/logos/coptic-orphans.png"></a>.</p>
`,f=`
<p>Lexicon data is released under <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>. <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer"><img class="inline-logo" alt="CC BY-SA 4.0" src="/img/logos/cc-by-sa.png"></a></p>

<p><a href="https://github.com/pishoyg/coptic/" target="_blank" rel="noopener noreferrer">Code</a> is released under <a href="https://www.gnu.org/licenses/gpl-3.0.en.html#license-text" target="_blank" rel="noopener noreferrer">GPL-3.0</a>. <a href="https://www.gnu.org/licenses/gpl-3.0.en.html#license-text" target="_blank" rel="noopener noreferrer"><img class="inline-logo" alt="GPL-3.0" src="/img/logos/gplv3.png"></a></p>
`,u=`
<p>Code lives at <a href="https://github.com/pishoyg/coptic/" target="_blank" rel="noopener noreferrer">github.com/pishoyg/coptic <img class="inline-logo" alt="https://github.com" src="/img/logos/github.png"></a>.
We are in need of contributors. If this work interests you, please reach out at ${l}.</p>
`,d={"cited-works":()=>[r.heading("Credits"),...e.parse(c),document.createElement("hr"),r.heading("Cited Works"),...e.parse(p),document.createElement("hr"),r.heading("Image Credits"),...e.parse(h),document.createElement("hr"),r.heading("License"),...e.parse(f)],contact:()=>[r.heading("Contact"),...e.parse(g)],donate:()=>[r.heading("Donate"),...e.parse(m)],code:()=>[r.heading("Code"),...e.parse(u)]};export function init(){Object.values(n).forEach(o=>{const i=document.getElementById(o);i&&new r.Panel(i,...d[o]())})}
//# sourceMappingURL=about.js.map
