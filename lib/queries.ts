// All DQL queries used by the dashboard.
// `tf` is a DQL duration literal like "2h", "24h", "7d".

export function queryTotalHosts() {
  return `
    smartscapeNodes HOST
    | filterOut isMonitoringCandidate == true
    | summarize hosts = count()
  `.trim()
}

export function queryHostsWithProblems(tf: string) {
  return `
    fetch events, from: now()-${tf}
    | filter event.kind == "DAVIS_EVENT"
    | filter event.status == "ACTIVE"
    | filter contains(toString(smartscape.affected_entity.ids), "HOST")
          or contains(toString(smartscape.related_entity.ids), "HOST")
    | summarize {
        affected_entities   = takeLast(smartscape.affected_entity.ids),
        related_entities    = takeLast(smartscape.related_entity.ids),
        is_dup              = takeLast(dt.davis.is_duplicate)
      }, by: { event.id }
    | filter isNull(is_dup) or not(is_dup)
    | expand affectedEntity = affected_entities
    | expand relatedEntity  = related_entities
    | filter startsWith(toString(affectedEntity), "HOST-")
          or startsWith(toString(relatedEntity),  "HOST-")
    | fieldsAdd host = if(startsWith(toString(affectedEntity), "HOST-"), affectedEntity, else: relatedEntity)
    | summarize problems = arraySize(collectDistinct(event.id)), by: { host }
    | filter problems > 0
    | summarize hosts = countDistinct(host)
  `.trim()
}

export function queryHostList() {
  return `
    smartscapeNodes HOST
    | filterOut isMonitoringCandidate == true
    | fields id, name
    | sort name asc
    | limit 200
  `.trim()
}

export function queryResourceTimeseries(tf: string, hostId?: string) {
  const filter = hostId
    ? `, filter: dt.smartscape.host == toSmartscapeId("${hostId}")`
    : ''
  return `
    timeseries {
      cpu    = avg(dt.host.cpu.usage),
      memory = avg(dt.host.memory.usage),
      disk   = min(dt.host.disk.free)
    }${filter}, from: now()-${tf}
    | fieldsAdd disk = 100 - disk[]
  `.trim()
}

export function queryCloudTypes() {
  return `
    smartscapeNodes HOST
    | filterOut isNull(cloud.provider)
    | summarize count = count(), by: { cloud.provider }
    | sort count desc
  `.trim()
}

export function queryMonitoringModes() {
  return `
    smartscapeNodes ONEAGENT
    | summarize count = count(), by:{ dt.agent.monitoring_mode }
    | sort count desc
  `.trim()
}

export function queryTotalTraffic(tf: string) {
  return `
    timeseries {
      rx = sum(dt.host.net.nic.bytes_rx),
      tx = sum(dt.host.net.nic.bytes_tx)
    }, from: now()-${tf}
    | fieldsAdd seconds = toLong(interval) / 1000000000
    | fieldsAdd volume  = (arraySum(rx) + arraySum(tx)) * seconds
    | summarize totalBytes = sum(volume)
  `.trim()
}

export function queryHostStates() {
  return `
    smartscapeNodes HOST
    | filterOut isMonitoringCandidate == true
    | fieldsAdd state = if(getEnd(lifetime) >= now() - 10m, "Running", else: "Inactive")
    | filterOut isNull(state)
    | summarize count = count(), by: { state }
    | sort count desc
  `.trim()
}

export function queryNetworkTimeseries(tf: string, hostId?: string) {
  const filter = hostId
    ? `, filter: dt.smartscape.host == toSmartscapeId("${hostId}")`
    : ''
  return `
    timeseries {
      rx = sum(dt.host.net.nic.bytes_rx),
      tx = sum(dt.host.net.nic.bytes_tx)
    }${filter}, from: now()-${tf}
  `.trim()
}

export function queryEventsByType(tf: string) {
  return `
    fetch events, from: now()-${tf}
    | filter event.kind == "DAVIS_EVENT"
    | filter contains(toString(smartscape.affected_entity.ids), "HOST")
    | filter matchesPhrase(event.name, "CPU") or matchesPhrase(event.name, "Memory")
          or matchesPhrase(event.name, "Disk") or matchesPhrase(event.group_label, "Disk")
    | fieldsAdd eventType = if(matchesPhrase(event.name, "Disk") or matchesPhrase(event.group_label, "Disk"), "Disk",
        else: if(matchesPhrase(event.name, "Cpu"), "CPU", else: "Memory"))
    | summarize {
        event.status          = takeLast(event.status),
        dt.davis.is_duplicate = takeLast(dt.davis.is_duplicate),
        eventType             = takeLast(eventType),
        event.end             = takeLast(event.end),
        event.start           = takeLast(event.start)
      }, by: { event.id }
    | filter isNull(dt.davis.is_duplicate) or not(dt.davis.is_duplicate)
    | filter event.status == "ACTIVE"
    | filter isNull(event.end) or event.end >= now()-${tf}
    | summarize event_count = countDistinct(event.id), by: { eventType }
  `.trim()
}

export function queryTopHostsByResource(tf: string) {
  return `
    timeseries {
      CPU    = avg(dt.host.cpu.usage),
      Memory = avg(dt.host.memory.usage),
      Disk   = min(dt.host.disk.free)
    }, by: { dt.smartscape.host }, from: now()-${tf}, union: true
    | fields
        dt.smartscape.host,
        CPU    = arrayLast(CPU),
        Memory = arrayLast(Memory),
        Disk   = 100 - arrayLast(Disk)
    | lookup [ smartscapeNodes HOST | fields id, name ], sourceField: dt.smartscape.host, lookupField: id, fields: { name }
    | filterOut isNull(name)
    | sort CPU desc
    | limit 10
    | fields Name = name, CPU, Memory, Disk
  `.trim()
}
