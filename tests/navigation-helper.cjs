const N = require("../navigation.js");
async function navigate(page, name, options = {}) {
  const group = N.groupFor(name);
  if (!group) return page.getByRole("button", { name, exact: true }).click();
  const root = page.locator(`#nav button[data-page="${group.page}"]`);
  if (await root.isVisible()) await root.click();
  else {
    await page.locator("#navigation-search").click();
    await page
      .locator(`#quick-menu-results [data-page="${group.page}"]`)
      .click();
  }
  if (group.sections.length === 1) return;
  const preferredSquad =
    options.squadTab ||
    (name === "Elenco" ? await page.evaluate(() => squadTab) : "tactics");
  const section = group.sections.find(
      (s) => s.page === name && (!s.squadTab || s.squadTab === preferredSquad),
    ),
    tab = page.locator("#" + N.tabId(group, section));
  if ((await tab.getAttribute("aria-selected")) !== "true") await tab.click();
}
module.exports = {
  navigate,
  createNavigator: (page) => (name, options) => navigate(page, name, options),
};
