---
title: Sponsors
permalink: /sponsors/
---


These are our sponsors who support the .NET Developers Austria community. If you are interested in sponsoring us, please [contact us](mailto:team@dotnetdevs.at).

{% for sponsor in site.sponsors %}
  {% assign sponsor_name = sponsor.name | default: sponsor.title %}
  {% assign sponsor_logo = sponsor.logo %}

  <div class="sponsor">
    <a href="{{ sponsor.url }}" class="sponsor-link">
        <img src="{{ sponsor_logo }}" alt="{{ sponsor_name }}" style="height:80px;margin-right:40px;vertical-align:middle;" class="sponsor-image">
    </a>
  </div>

  <hr>
{% endfor %}