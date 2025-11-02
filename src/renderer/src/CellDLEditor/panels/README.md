# Property panels

* `Metadata` to become `Annotation`.
* Annotation is for external annotation, possibly managed via `annotation` plugins (initially for biological annotation).
* Properties to have editor specific part for generic properties (`label`, `description`, ??) and plugin part.
* Plugin part will come from the selected object's plugin in response to a `selected` message.
* Plugin will get all events from its part and is responsible for updating its object's properties.
* Updated object could result in changed SVG representing the object -- send message to diagram (and panel for preview) so thay can update what's showing.
