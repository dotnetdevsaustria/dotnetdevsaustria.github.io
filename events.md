{% assign events = site.events  %}
{% for event in events reversed  %}
  <div class="event">
    <h2>{{ event.date | date: "%Y-%m-%d" }} - {{ event.title }}</h2>
    <p>Speakers: {{ event.speakers | join: ", " }}</p>
    <p>{{ event.abstract }}</p>
    <a href="{{ event.url }}" class="btn">Learn More</a>
  </div>
{% endfor %}