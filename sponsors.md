---
title: Sponsors
permalink: /sponsors/
---

## Our Sponsors

These are our sponsors who support the .NET Developers Austria community.

{% for sponsor in site.sponsors %}
  {% assign sponsor_name = sponsor.name | default: sponsor.title %}
  {% assign sponsor_logo = sponsor.logo %}

  <div class="supporter">
    <a href="{{ sponsor.url }}" class="supporter-link">
        <img src="{{ sponsor_logo }}" alt="{{ sponsor_name }}" style="height:80px;margin-right:40px;vertical-align:middle;" class="supporter-image">
    </a>
  </div>

  <hr>
{% endfor %}

## Why Sponsor Us?

To organize meetups and events, we need support. This can be purely financial, providing a venue, catering, or a combination of all.

Our meetups take place every month on weekdays (Monday - Thursday) in the evening (starting at 6:00 PM).  
Participants at our events are primarily .NET developers ranging from juniors to architects. Depending on the month and topic, there are between 30 and 50 attendees.

Why should you support us?

- Make it easier for your employees to attend and continue their professional development
- Increase your visibility in the .NET developer community
- Employer branding

If you are interested in supporting us, please [contact us](mailto:team@dotnetdevs.at).

### Sponsorship Packages Suggestions

#### Location Sponsoring

You get:

- A 5-minute speaking slot during the opening
- Complete freedom in room decoration and branding

We get:

- Venue/facilities
- Food and drinks for attendees
- Internet access for streaming (min 10 Mbit/s upload, HTTP/HTTPS)

#### Financial Sponsoring

You get:

- Your company logo and mention in the intro and outro for 12 events (at least 12 months)
- Your company logo on the homepage for 12 events (at least 12 months)

We get:

- €500
