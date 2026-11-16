
const API = "https://www.themealdb.com/api/json/v1/1/";
const TRANSLATE_API = "https://api.mymemory.translated.net/get";

const form = document.querySelector("#formBusca");
const searchInput = document.querySelector("#pesquisa");
const resultsGrid = document.querySelector("#listaReceitas");
const statePanel = document.querySelector("#mensagem");
const resultTitle = document.querySelector("#tituloResultados");
const resultCount = document.querySelector("#contador");
const randomButton = document.querySelector("#botaoAleatoria");
const heroRandomButton = document.querySelector("#heroRandom");
const modal = document.querySelector("#modalReceita");
const modalDetails = document.querySelector("#detalhesReceita");
const modalClose = document.querySelector("#fecharModal");
const toastRegion = document.querySelector("#toastRegion");
const menuToggle = document.querySelector("#menuToggle");
const navLinks = document.querySelector(".nav-links");

const translationCache = new Map();
let activeSearch = 0;
let lastFocusedElement = null;

const fallbackTranslations = {
  chicken: "Frango",
  beef: "Carne bovina",
  pork: "Carne de porco",
  fish: "Peixe",
  rice: "Arroz",
  potato: "Batata",
  egg: "Ovo",
  eggs: "Ovos",
  cake: "Bolo",
  pasta: "Macarrão",
  cheese: "Queijo",
  onion: "Cebola",
  garlic: "Alho",
  tomato: "Tomate",
  milk: "Leite",
  butter: "Manteiga",
  flour: "Farinha",
  sugar: "Açúcar",
  salt: "Sal",
  pepper: "Pimenta",
  breakfast: "Café da manhã",
  dessert: "Sobremesa",
  starter: "Entrada",
  side: "Acompanhamento",
  vegan: "Vegano",
  vegetarian: "Vegetariano",
  seafood: "Frutos do mar",
  miscellaneous: "Variados",
  "pasta dishes": "Massas",
  "chicken dishes": "Pratos com frango",
  british: "Britânica",
  american: "Americana",
  italian: "Italiana",
  french: "Francesa",
  mexican: "Mexicana",
  indian: "Indiana",
  chinese: "Chinesa",
  japanese: "Japonesa",
  thai: "Tailandesa",
  turkish: "Turca",
  greek: "Grega",
  canadian: "Canadense",
  croatian: "Croata",
  dutch: "Holandesa",
  egyptian: "Egípcia",
  filipino: "Filipina",
  irish: "Irlandesa",
  jamaican: "Jamaicana",
  kenyan: "Queniana",
  malaysian: "Malaia",
  moroccan: "Marroquina",
  polish: "Polonesa",
  portuguese: "Portuguesa",
  russian: "Russa",
  spanish: "Espanhola",
  tunisian: "Tunisiana",
  vietnamese: "Vietnamita",
  ukrainian: "Ucraniana"
};

const termMap = {
  "frango": "chicken",
  "carne": "beef",
  "carne bovina": "beef",
  "carne de porco": "pork",
  "peixe": "fish",
  "macarrão": "pasta",
  "massa": "pasta",
  "bolo": "cake",
  "batata": "potato",
  "arroz": "rice",
  "ovo": "egg",
  "ovos": "egg",
  "queijo": "cheese",
  "camarão": "prawns",
  "cogumelo": "mushroom",
  "tomate": "tomato",
  "cebola": "onion",
  "alho": "garlic",
  "salada": "salad",
  "vegetariano": "vegetarian",
  "sobremesa": "dessert"
};

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function safeURL(value) {
  try {
    const url = new URL(value);

    return ["http:", "https:"].includes(url.protocol)
      ? url.href
      : "";
  } catch {
    return "";
  }
}

function notify(message, type = "info") {
  const toast = document.createElement("div");

  toast.className = `toast ${type === "error" ? "error" : ""}`;
  toast.textContent = message;

  toastRegion.appendChild(toast);

  window.setTimeout(() => toast.remove(), 4200);
}

async function translate(text, source = "en", target = "pt-BR") {
  if (!text || !String(text).trim()) {
    return text || "";
  }

  const key = `${source}|${target}|${text}`;

  if (translationCache.has(key)) {
    return translationCache.get(key);
  }

  try {
    const url =
      `${TRANSLATE_API}?q=${encodeURIComponent(text)}` +
      `&langpair=${encodeURIComponent(`${source}|${target}`)}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Serviço de tradução indisponível.");
    }

    const data = await response.json();

    if (
      data.responseStatus === 200 &&
      data.responseData?.translatedText
    ) {
      const decoded = decodeHTML(
        data.responseData.translatedText
      );

      translationCache.set(key, decoded);

      return decoded;
    }
  } catch (error) {
    console.warn(
      "Tradução temporariamente indisponível:",
      error.message
    );
  }

  const fallback = fallbackTranslations[
    String(text).toLowerCase()
  ];

  return fallback || text;
}

function decodeHTML(text) {
  const textarea = document.createElement("textarea");

  textarea.innerHTML = text;

  return textarea.value;
}

async function translateQuery(query) {
  const normalized = query
    .trim()
    .toLocaleLowerCase("pt-BR");

  if (termMap[normalized]) {
    return termMap[normalized];
  }

  return translate(query.trim(), "pt-BR", "en");
}

async function apiRequest(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `A API respondeu com o código ${response.status}.`
    );
  }

  return response.json();
}

function showState(title, description, type = "empty") {
  resultsGrid.innerHTML = "";

  statePanel.className =
    `state-panel ${type === "error" ? "is-error" : ""}`;

  statePanel.hidden = false;

  statePanel.innerHTML = `
    <div class="state-art">
      <span>${type === "error" ? "!" : "✳"}</span>
      <i>✦</i>
      <b>♥</b>
    </div>

    <p class="state-kicker">
      ${type === "error"
        ? "UM PEQUENO IMPREVISTO"
        : "SABORÊ • IDEIAS À MESA"}
    </p>

    <h3>${escapeHTML(title)}</h3>

    <p>${escapeHTML(description)}</p>

    ${type === "empty"
      ? `<button class="text-action" type="button" id="stateSearch">
          Tentar outra busca <span>↗</span>
        </button>`
      : ""}
  `;

  resultCount.textContent =
    type === "error" ? "ERRO NA BUSCA" : "NENHUM RESULTADO";

  const focusButton = document.querySelector("#stateSearch");

  if (focusButton) {
    focusButton.addEventListener("click", () => {
      searchInput.focus();
    });
  }
}

function showLoading(title = "Procurando algo delicioso...") {
  statePanel.hidden = false;
  statePanel.className = "state-panel is-loading";

  statePanel.innerHTML = `
    <div class="loading-wheel" aria-hidden="true"></div>

    <p class="state-kicker">SÓ UM INSTANTINHO</p>

    <h3>${escapeHTML(title)}</h3>

    <p>
      Estamos procurando uma ideia que combine com você.
    </p>

    <div class="loading-dots" aria-hidden="true">
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;

  resultsGrid.innerHTML = "";
  resultCount.textContent = "BUSCANDO...";
}

function hideState() {
  statePanel.hidden = true;
}

async function translateSafe(
  text,
  fallback = "Não informada"
) {
  if (!text) {
    return fallback;
  }

  const result = await translate(text);

  return result || fallback;
}

async function getMealDetails(id) {
  const data = await apiRequest(
    `${API}lookup.php?i=${encodeURIComponent(id)}`
  );

  if (!data.meals?.length) {
    throw new Error(
      "Não encontramos os detalhes dessa receita."
    );
  }

  return data.meals[0];
}

function getImageURL(meal) {
  return safeURL(meal.strMealThumb) ||
    "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80";
}

async function renderRecipes(meals, requestId) {
  if (!meals?.length) {
    showState(
      "Não encontramos essa receita.",
      "Experimente um termo mais simples, como frango, bolo ou arroz."
    );

    return;
  }

  const uniqueMeals = [
    ...new Map(
      meals.map(meal => [meal.idMeal, meal])
    ).values()
  ].slice(0, 9);

  showLoading("Dando os últimos toques nos resultados...");

  const enriched = await Promise.all(
    uniqueMeals.map(async meal => {
      if (meal.strCategory && meal.strArea) {
        return meal;
      }

      try {
        return await getMealDetails(meal.idMeal);
      } catch {
        return meal;
      }
    })
  );

  const cards = await Promise.all(
    enriched.map(async (meal, index) => {
      const [name, category, area] = await Promise.all([
        translateSafe(meal.strMeal, "Receita sem nome"),
        translateSafe(meal.strCategory, "Receita"),
        translateSafe(meal.strArea, "Origem não informada")
      ]);

      return `
        <article
          class="recipe-card"
          style="animation-delay:${Math.min(index * 65, 400)}ms"
        >
          <div class="recipe-image-wrap">
            <img
              class="recipe-image"
              src="${escapeHTML(getImageURL(meal))}"
              alt="${escapeHTML(name)}"
              loading="lazy"
            >

            <div class="image-wash"></div>

            <span class="recipe-badge">
              ${escapeHTML(category)}
            </span>
          </div>

          <div class="recipe-card-body">
            <span class="recipe-card-kicker">
              UMA IDEIA PARA SUA MESA
            </span>

            <h3>${escapeHTML(name)}</h3>

            <div class="recipe-card-meta">
              <span>✳ ${escapeHTML(category)}</span>
              <span>⌖ ${escapeHTML(area)}</span>
            </div>

            <div class="recipe-card-footer">
              <small>
                Receita ${String(index + 1).padStart(2, "0")}
              </small>

              <button
                type="button"
                class="recipe-open"
                data-id="${escapeHTML(meal.idMeal)}"
              >
                Ver receita <span>↗</span>
              </button>
            </div>
          </div>
        </article>
      `;
    })
  );

  if (requestId !== activeSearch) {
    return;
  }

  hideState();

  resultsGrid.innerHTML = cards.join("");

  resultCount.textContent =
    `${enriched.length} RECEITA${enriched.length === 1 ? "" : "S"} ENCONTRADA${enriched.length === 1 ? "" : "S"}`;

  resultsGrid.querySelectorAll(".recipe-open").forEach(button => {
    button.addEventListener("click", () => {
      openRecipe(button.dataset.id);
    });
  });
}

async function searchRecipes(term, type = "nome") {
  const requestId = ++activeSearch;
  const query = term.trim();

  if (!query) {
    showState(
      "Vamos começar com uma palavra?",
      "Digite o nome de um prato ou um ingrediente para buscar."
    );

    searchInput.focus();

    return;
  }

  resultTitle.innerHTML =
    `Ideias para <em>${escapeHTML(query)}.</em>`;

  showLoading("Entendendo sua busca...");

  try {
    const englishTerm = await translateQuery(query);

    if (requestId !== activeSearch) {
      return;
    }

    showLoading("Procurando receitas pelo mundo...");

    let endpoint;

    if (type === "ingrediente") {
      endpoint =
        `${API}filter.php?i=${encodeURIComponent(englishTerm)}`;
    } else {
      endpoint =
        `${API}search.php?s=${encodeURIComponent(englishTerm)}`;
    }

    const data = await apiRequest(endpoint);

    if (requestId !== activeSearch) {
      return;
    }

    await renderRecipes(data.meals || [], requestId);
  } catch (error) {
    console.error(error);

    if (requestId === activeSearch) {
      showState(
        "A cozinha deu uma pausa.",
        "Não conseguimos acessar as receitas agora. Confira sua conexão e tente novamente.",
        "error"
      );

      notify(
        "Falha ao consultar as receitas. Tente novamente.",
        "error"
      );
    }
  }
}

function ingredientsFromMeal(meal) {
  const ingredients = [];

  for (let index = 1; index <= 20; index++) {
    const ingredient =
      meal[`strIngredient${index}`]?.trim();

    const amount =
      meal[`strMeasure${index}`]?.trim();

    if (ingredient) {
      ingredients.push({
        ingredient,
        amount: amount || ""
      });
    }
  }

  return ingredients;
}

function splitInstructions(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .trim();
}

async function openRecipe(id) {
  lastFocusedElement = document.activeElement;

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  modalDetails.innerHTML = `
    <div class="modal-loading">
      <div class="loading-wheel"></div>
      <h3>Preparando essa descoberta...</h3>
      <p>Reunindo ingredientes e modo de preparo.</p>
    </div>
  `;

  modalClose.focus();

  try {
    const meal = await getMealDetails(id);

    const [name, category, area, instructions] =
      await Promise.all([
        translateSafe(meal.strMeal, "Receita"),
        translateSafe(meal.strCategory, "Categoria não informada"),
        translateSafe(meal.strArea, "Origem não informada"),
        translate(
          meal.strInstructions ||
            "Modo de preparo não informado.",
          "en",
          "pt-BR"
        )
      ]);

    const ingredients = ingredientsFromMeal(meal);

    const ingredientMarkup = await Promise.all(
      ingredients.map(async item => {
        const translatedName = await translateSafe(
          item.ingredient,
          item.ingredient
        );

        const translatedAmount = item.amount
          ? await translate(item.amount)
          : "";

        return `
          <li class="ingredient-item">
            <strong>${escapeHTML(translatedName)}</strong>
            <span class="ingredient-amount">
              ${escapeHTML(translatedAmount)}
            </span>
          </li>
        `;
      })
    );

    const source = safeURL(meal.strSource);
    const video = safeURL(meal.strYoutube);

    const links = [
      video
        ? `<a class="modal-link secondary"
             href="${video}"
             target="_blank"
             rel="noopener noreferrer">
             ▶ Assistir vídeo <span>↗</span>
           </a>`
        : "",

      source
        ? `<a class="modal-link"
             href="${source}"
             target="_blank"
             rel="noopener noreferrer">
             Receita original <span>↗</span>
           </a>`
        : ""
    ].filter(Boolean).join("");

    modalDetails.innerHTML = `
      <div class="modal-hero">
        <img
          src="${escapeHTML(getImageURL(meal))}"
          alt="${escapeHTML(name)}"
        >

        <span class="modal-hero-label">
          SABORÊ • RECEITA PARA DESCOBRIR
        </span>
      </div>

      <div class="modal-content">
        <span class="modal-kicker">
          UMA NOVA HISTÓRIA À MESA
        </span>

        <h2 class="modal-title" id="modalTitulo">
          ${escapeHTML(name)}
        </h2>

        <div class="modal-tags">
          <span>✳ ${escapeHTML(category)}</span>
          <span>⌖ ${escapeHTML(area)}</span>
        </div>

        <p class="modal-intro">
          Separe os ingredientes, reserve um momento para você
          e aproveite o processo. Bom apetite!
        </p>

        <div class="modal-columns">
          <section>
            <h3 class="modal-section-title">
              <span>✳</span> Ingredientes
            </h3>

            <ul class="ingredient-list">
              ${ingredientMarkup.join("")}
            </ul>
          </section>

          <section>
            <h3 class="modal-section-title">
              <span>↗</span> Modo de preparo
            </h3>

            <p class="method-text">
              ${escapeHTML(splitInstructions(instructions))}
            </p>
          </section>
        </div>

        ${links
          ? `<div class="modal-links">${links}</div>`
          : `<p class="modal-intro">
               Não há links externos disponíveis para esta receita.
             </p>`}
      </div>
    `;
  } catch (error) {
    console.error(error);

    modalDetails.innerHTML = `
      <div class="modal-loading">
        <h3>Não conseguimos abrir a receita.</h3>
        <p>Confira sua conexão e tente novamente.</p>
        <button
          class="button button-primary"
          id="tentarDetalhes"
          type="button"
        >
          Tentar novamente
        </button>
      </div>
    `;

    document
      .querySelector("#tentarDetalhes")
      ?.addEventListener("click", () => openRecipe(id));
  }
}

function closeRecipe() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");

  if (
    lastFocusedElement &&
    typeof lastFocusedElement.focus === "function"
  ) {
    lastFocusedElement.focus();
  }
}

async function randomRecipe() {
  const requestId = ++activeSearch;

  const buttons = [
    randomButton,
    heroRandomButton
  ].filter(Boolean);

  buttons.forEach(button => {
    button.disabled = true;
  });

  randomButton.dataset.originalText =
    randomButton.dataset.originalText ||
    randomButton.innerHTML;

  randomButton.textContent = "Buscando surpresa...";

  resultTitle.innerHTML = `Uma surpresa <em>para você.</em>`;

  showLoading("Sorteando uma receita especial...");

  try {
    const data = await apiRequest(`${API}random.php`);

    if (requestId !== activeSearch) {
      return;
    }

    if (!data.meals?.length) {
      throw new Error("A API não retornou uma receita.");
    }

    await renderRecipes(data.meals, requestId);
  } catch (error) {
    console.error(error);

    if (requestId === activeSearch) {
      showState(
        "A surpresa ficou para depois.",
        "Não conseguimos sortear uma receita agora. Tente novamente.",
        "error"
      );
    }
  } finally {
    buttons.forEach(button => {
      button.disabled = false;
    });

    randomButton.innerHTML =
      randomButton.dataset.originalText ||
      "Me surpreenda <span>↗</span>";
  }
}

form.addEventListener("submit", event => {
  event.preventDefault();

  const type = document.querySelector(
    'input[name="tipoBusca"]:checked'
  )?.value || "nome";

  searchRecipes(searchInput.value, type);

  document.querySelector("#explorar").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
});

document.querySelectorAll(".quick-chip").forEach(button => {
  button.addEventListener("click", () => {
    searchInput.value = button.dataset.termo;

    document.querySelector(
      'input[name="tipoBusca"][value="nome"]'
    ).checked = true;

    searchRecipes(button.dataset.termo, "nome");

    document.querySelector("#explorar").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
});

document.querySelectorAll(".collection-card").forEach(button => {
  button.addEventListener("click", () => {
    const term = button.dataset.termo;
    const type = button.dataset.busca || "nome";

    searchInput.value = term;

    document.querySelector(
      `input[name="tipoBusca"][value="${type}"]`
    ).checked = true;

    searchRecipes(term, type);

    document.querySelector("#explorar").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
});

randomButton.addEventListener("click", randomRecipe);

heroRandomButton.addEventListener("click", randomRecipe);

modalClose.addEventListener("click", closeRecipe);

modal.querySelector("[data-fechar-modal]")
  .addEventListener("click", closeRecipe);

document.addEventListener("keydown", event => {
  if (
    event.key === "Escape" &&
    modal.classList.contains("is-open")
  ) {
    closeRecipe();
  }
});

menuToggle.addEventListener("click", () => {
  const open = navLinks.classList.toggle("is-open");

  menuToggle.setAttribute("aria-expanded", String(open));

  menuToggle.setAttribute(
    "aria-label",
    open ? "Fechar menu" : "Abrir menu"
  );
});

navLinks.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
  });
});

statePanel.addEventListener("click", event => {
  if (event.target.closest("#stateSearch")) {
    searchInput.focus();
  }
});

// Identifica imagens que falharem ao carregar.
document.addEventListener("error", event => {
  if (event.target instanceof HTMLImageElement) {
    event.target.classList.add("image-failed");
  }
}, true);
