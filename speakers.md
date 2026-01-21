---
title: Speakers
permalink: /speakers/
---

These are all speakers that have been featured in our events. If you are interested in speaking at one of our events, please [contact us](mailto:team@dotnetdevs.at).

{% for speaker in site.speakers %}
  {% assign speaker_name = speaker.name | default: speaker.title %}
  {% assign speaker_bio = speaker.bio | default: "" %}
  {% assign speaker_image = speaker.image %}

  <div class="speaker">
    <a href="{{ speaker.url }}" class="speaker-link"><h3 class="speaker-name">{{ speaker_name }}</h3></a>
    {% if speaker_image != nil %}
      <img src="{{ speaker_image }}" alt="{{ speaker_name }}" class="speaker-image">
    {% endif %}
    <p class="speaker-bio">{{ speaker_bio }}</p>
  </div>

  <hr>
{% endfor %}
