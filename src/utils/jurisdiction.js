const District = require('../models/District');
const GridSubstation = require('../models/GridSubstation');
const SolarInstallation = require('../models/SolarInstallation');
const ApiError = require('./ApiError');

// Resolves a jurisdiction filter (province_id, district_id, or
// substation_id — most specific wins) down to a concrete list of
// installation_ids. Returns null if no filter was given (no restriction).
async function resolveInstallationIds({ province_id, district_id, substation_id }) {
  if (substation_id) {
    const installations = await SolarInstallation.find({ substation_id }).select('installation_id');
    return installations.map((i) => i.installation_id);
  }
  if (district_id) {
    const substations = await GridSubstation.find({ district_id }).select('substation_id');
    const substationIds = substations.map((s) => s.substation_id);
    const installations = await SolarInstallation.find({ substation_id: { $in: substationIds } }).select('installation_id');
    return installations.map((i) => i.installation_id);
  }
  if (province_id) {
    const districts = await District.find({ province_id }).select('district_id');
    const districtIds = districts.map((d) => d.district_id);
    const substations = await GridSubstation.find({ district_id: { $in: districtIds } }).select('substation_id');
    const substationIds = substations.map((s) => s.substation_id);
    const installations = await SolarInstallation.find({ substation_id: { $in: substationIds } }).select('installation_id');
    return installations.map((i) => i.installation_id);
  }
  return null;
}

// Given the logged-in user's auth payload (role/province_id/district_id)
// and whatever jurisdiction filter they requested in the query string,
// returns the EFFECTIVE filter to actually apply — or throws 403 if
// they requested something outside their own scope.
//
// Rule: each role may query AT or NARROWER than its own granularity,
// never broader. A 'district' user may not filter by province_id at
// all, even their own — province is a broader grain than their token.
async function enforceJurisdictionScope(auth, { province_id, district_id, substation_id }) {
  if (!auth) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required.');
  }

  if (auth.role === 'national') {
    return { province_id, district_id, substation_id };
  }

  if (auth.role === 'provincial') {
    const userProvince = auth.province_id;

    if (province_id && province_id !== userProvince) {
      throw new ApiError(403, 'FORBIDDEN', 'Requested province is outside your jurisdiction.');
    }
    if (district_id) {
      const d = await District.findOne({ district_id });
      if (!d || d.province_id !== userProvince) {
        throw new ApiError(403, 'FORBIDDEN', 'Requested district is outside your jurisdiction.');
      }
    }
    if (substation_id) {
      const s = await GridSubstation.findOne({ substation_id });
      if (!s) throw new ApiError(404, 'NOT_FOUND', `Substation ${substation_id} not found.`);
      const d = await District.findOne({ district_id: s.district_id });
      if (!d || d.province_id !== userProvince) {
        throw new ApiError(403, 'FORBIDDEN', 'Requested substation is outside your jurisdiction.');
      }
    }

    if (!province_id && !district_id && !substation_id) {
      return { province_id: userProvince }; // default scope
    }
    return { province_id, district_id, substation_id };
  }

  if (auth.role === 'district') {
    const userDistrict = auth.district_id;

    if (province_id) {
      throw new ApiError(403, 'FORBIDDEN', 'District-level access cannot query by province.');
    }
    if (district_id && district_id !== userDistrict) {
      throw new ApiError(403, 'FORBIDDEN', 'Requested district is outside your jurisdiction.');
    }
    if (substation_id) {
      const s = await GridSubstation.findOne({ substation_id });
      if (!s) throw new ApiError(404, 'NOT_FOUND', `Substation ${substation_id} not found.`);
      if (s.district_id !== userDistrict) {
        throw new ApiError(403, 'FORBIDDEN', 'Requested substation is outside your jurisdiction.');
      }
    }

    if (!district_id && !substation_id) {
      return { district_id: userDistrict }; // default scope
    }
    return { district_id, substation_id };
  }

  throw new ApiError(403, 'FORBIDDEN', 'Unrecognised role.');
}

// Checks whether ONE specific installation falls within the caller's
// jurisdiction. Used by /installations/:id/readings and /latest-reading,
// so a direct-by-ID request can't bypass the /readings query-level scoping.
async function assertInstallationInScope(auth, installation_id) {
  if (!auth) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required.');
  }
  if (auth.role === 'national') return;

  const installation = await SolarInstallation.findOne({ installation_id });
  if (!installation) {
    throw new ApiError(404, 'NOT_FOUND', `Installation ${installation_id} not found.`);
  }
  const substation = await GridSubstation.findOne({ substation_id: installation.substation_id });
  if (!substation) {
    throw new ApiError(404, 'NOT_FOUND', `Substation for installation ${installation_id} not found.`);
  }

  if (auth.role === 'district') {
    if (substation.district_id !== auth.district_id) {
      throw new ApiError(403, 'FORBIDDEN', 'This installation is outside your jurisdiction.');
    }
    return;
  }

  if (auth.role === 'provincial') {
    const district = await District.findOne({ district_id: substation.district_id });
    if (!district || district.province_id !== auth.province_id) {
      throw new ApiError(403, 'FORBIDDEN', 'This installation is outside your jurisdiction.');
    }
    return;
  }

  throw new ApiError(403, 'FORBIDDEN', 'Unrecognised role.');
}

// Checks whether ONE specific district falls within the caller's scope.
// Used by the district generation-summary endpoint.
async function assertDistrictInScope(auth, district_id) {
  if (!auth) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required.');
  }
  if (auth.role === 'national') return;

  if (auth.role === 'district') {
    if (district_id !== auth.district_id) {
      throw new ApiError(403, 'FORBIDDEN', 'This district is outside your jurisdiction.');
    }
    return;
  }

  if (auth.role === 'provincial') {
    const district = await District.findOne({ district_id });
    if (!district || district.province_id !== auth.province_id) {
      throw new ApiError(403, 'FORBIDDEN', 'This district is outside your jurisdiction.');
    }
    return;
  }

  throw new ApiError(403, 'FORBIDDEN', 'Unrecognised role.');
}

module.exports = {
  resolveInstallationIds,
  enforceJurisdictionScope,
  assertInstallationInScope,
  assertDistrictInScope,
};