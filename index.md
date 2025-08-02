---
layout: default
title: Home
---

# Welcome to DotNetDevs.at

The DotNetDevs.at is an association, which activities are not about gaining profit, it’s purpose is to spread knowledge and experience about the usage of .NET technologies.

## Our goals are:

make it easier for new participants to find existing communities
offer existing members more choice
promote the exchange between the different communities

## Our Sponsors

<a href="/sponsors/rubicon/"><img src="/assets/images/rubicon.svg" alt="Rubicon" style="height:80px;margin-right:20px;vertical-align:middle;"></a>
<a href="/sponsors/jetbrains/"><img src="/assets/images/jetbrains.svg" alt="JetBrains" style="height:80px;margin-right:20px;vertical-align:middle;"></a>

## Next Events

{% assign events = site.events  %}
{% for event in events reversed  %}
  <div class="event">
    <h2>{{ event.title }}</h2>
    <p>{{ event.date | date: "%B %d, %Y" }}</p>
    <p>{{ event.description }}</p>
    <a href="{{ event.url }}" class="btn">Learn More</a>
  </div>
{% endfor %}