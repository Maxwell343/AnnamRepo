export type ListingStatus = 'available' | 'claimed' | 'assigned' | 'in_transit' | 'delivered' | 'expired';

export type ListingType = 'Vegetable' | 'Fruit' | 'Grain' | 'Other';

export interface ClaimedBy {
  ngo_id: string;
  ngo_name: string;
  ngo_phone?: string;
  ngo_address?: string;
  claim_quantity?: string;
}

export interface AssignedDriver {
  driver_id: string;
  driver_name: string;
  driver_phone?: string;
  vehicle_number?: string;
}

/** Core food listing object returned by the API. */
export interface FoodListing {
  id: string;
  farmer_id: string;
  farmer_name?: string;
  title: string;
  quantity: string;
  type: ListingType;
  expiry?: string;
  expiry_date?: string;
  description?: string;
  image?: string;
  created_at?: string;
  status?: ListingStatus;
  pickup_location?: string;
  pickup_address?: string;
  delivery_location?: string;
  claimed_by?: string | ClaimedBy;
  assigned_driver?: string | AssignedDriver;
  donation_mode?: boolean;
}

export type DeliveryTaskStatus = 'pending' | 'picked_up' | 'in_transit' | 'delivered';

/** Driver delivery task. */
export interface DeliveryTask {
  id: string;
  listing_id: string;
  listing_title: string;
  pickup_location: string;
  delivery_location: string;
  status: DeliveryTaskStatus;
  farmer_name: string;
  ngo_name: string;
  quantity: string;
}
