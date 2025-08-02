{% assign events = site.events  %}
{% for event in events reversed  %}
  {% if event.public == nil or event.public == false %}
    {% continue %}
  {% endif %}
  
  <div class="event">
    <a href="{{ event.url }}"><h2>{{ event.date | date: "%Y-%m-%d" }} - {{ event.title }}</h2></a>
    <p>Speakers: {{ event.speakers | join: ", " }}</p>
    <p>{{ event.abstract | markdownify }}</p>
    <a href="{{ event.url }}" class="btn-large">Go to Details</a>
  </div>
{% endfor %}
