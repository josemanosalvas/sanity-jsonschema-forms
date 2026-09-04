/** `querySelector` that fails the test loudly instead of handing back `null`. */
export const query = (root: ParentNode, selector: string): Element => {
  const element = root.querySelector(selector)
  if (element === null) {
    throw new Error(`No element matches "${selector}"`)
  }
  return element
}
