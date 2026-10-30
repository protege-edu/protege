/**
 * A browser too old to run Protégé (e.g. an iPad stuck before iPadOS 16.4) would otherwise get a dark page with
 * only the logo: the page arrives, but its code can't run, so nothing fades in. This tiny check runs first,
 * written in old JavaScript every browser understands, and if the browser can't do what Protégé needs, it says
 * so plainly instead.
 *
 * (Its words can't come from the age styles like everything else on a student's screen: it runs before any of
 * Protégé's code can, on a browser that can't run it.)
 */
const words = {
  en: {
    title: "This device is too old for Protégé",
    body: "Its web browser can't run Protégé. Use another computer, Chromebook or tablet, or update this one (on an iPad: iPadOS 16.4 or newer).",
  },
  fr: {
    title: "Cet appareil est trop vieux pour Protégé",
    body: "Son navigateur ne peut pas faire fonctionner Protégé. Utilise un autre ordinateur, Chromebook ou tablette, ou mets celui-ci à jour (sur un iPad : iPadOS 16.4 ou plus récent).",
  },
};

// what Protégé's code needs that old Safari lacks: look-behind in patterns (Safari 16.4), Array.at, structuredClone
export const OLD_BROWSER_CHECK = `(function(){var ok=true;try{new RegExp("(?<=a)b")}catch(e){ok=false}
if(ok&&!Array.prototype.at)ok=false;if(ok&&typeof structuredClone!=="function")ok=false;if(ok)return;
var w=/^fr/i.test(navigator.language||"")?${JSON.stringify(words.fr)}:${JSON.stringify(words.en)};
function show(){var box=document.createElement("div");box.setAttribute("role","alert");
box.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:24px;background:#0d1613;color:#d3ddd6;font:19px/1.5 -apple-system,system-ui,sans-serif;text-align:center";
var inner=document.createElement("div");inner.style.maxWidth="30em";
var t=document.createElement("p");t.style.cssText="font-size:28px;font-weight:700;margin:0 0 12px";t.textContent=w.title;
var b=document.createElement("p");b.style.margin="0";b.textContent=w.body;
inner.appendChild(t);inner.appendChild(b);box.appendChild(inner);document.body.appendChild(box)}
if(document.body)show();else document.addEventListener("DOMContentLoaded",show)})();`;
