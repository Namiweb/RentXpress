import { useState } from 'react';
import { UserIcon, MailIcon, PhoneIcon, MapPinIcon, CalendarIcon, EditIcon, SaveIcon, XIcon } from 'lucide-react';
import { apiRequest } from '../../../../services/api.js';

function ProfileEditModal({ user, isOpen, onClose, onUpdate }) {
  const [formData, setFormData] = useState({
    firstName: user?.profile?.firstName || '',
    lastName: user?.profile?.lastName || '',
    phone: user?.profile?.phone || '',
    address: user?.profile?.address || '',
    dateOfBirth: user?.profile?.dateOfBirth ? new Date(user?.profile?.dateOfBirth).toISOString().split('T')[0] : '',
    emergencyContact: {
      name: user?.profile?.emergencyContact?.name || '',
      phone: user?.profile?.emergencyContact?.phone || '',
      relationship: user?.profile?.emergencyContact?.relationship || ''
    },
    specializations: (user?.profile?.specializations || []).join(', '),
    certifications: (user?.profile?.certifications || []).join(', '),
    experience: user?.profile?.experience || ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleEmergencyContactChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      emergencyContact: {
        ...prev.emergencyContact,
        [field]: value
      }
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const updateData = {
        profile: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          address: formData.address,
          dateOfBirth: formData.dateOfBirth,
          emergencyContact: formData.emergencyContact,
          specializations: formData.specializations.split(',').map(item => item.trim()).filter(item => item),
          certifications: formData.certifications.split(',').map(item => item.trim()).filter(item => item),
          experience: formData.experience
        }
      };

      const response = await apiRequest(`/users/${user._id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }

      onUpdate?.(data);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '2rem'
    }} onClick={onClose}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '2rem 2rem 0 2rem',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600', color: '#1f2937' }}>
            Edit Profile
          </h2>
          <button 
            type="button" 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '6px',
              color: '#6b7280'
            }}
          >
            <XIcon size={20} />
          </button>
        </div>

        {error && (
          <div style={{
            margin: '1.5rem 2rem 0 2rem',
            padding: '12px 16px',
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#991b1b'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ padding: '2rem', display: 'grid', gap: '2rem' }}>
          <div>
            <h3 style={{ 
              margin: '0 0 1.5rem', 
              fontSize: '1.125rem', 
              fontWeight: '600', 
              color: '#1f2937' 
            }}>
              Personal Information
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: '500', 
                  color: '#374151' 
                }}>
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>
              
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: '500', 
                  color: '#374151' 
                }}>
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: '500', 
                  color: '#374151' 
                }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: '500', 
                  color: '#374151' 
                }}>
                  Date of Birth
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontWeight: '500', 
                color: '#374151' 
              }}>
                Address
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  outline: 'none',
                  resize: 'vertical'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
            </div>
          </div>

          <div>
            <h3 style={{ 
              margin: '0 0 1.5rem', 
              fontSize: '1.125rem', 
              fontWeight: '600', 
              color: '#1f2937' 
            }}>
              Emergency Contact
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: '500', 
                  color: '#374151' 
                }}>
                  Contact Name
                </label>
                <input
                  type="text"
                  value={formData.emergencyContact.name}
                  onChange={(e) => handleEmergencyContactChange('name', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: '500', 
                  color: '#374151' 
                }}>
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={formData.emergencyContact.phone}
                  onChange={(e) => handleEmergencyContactChange('phone', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: '500', 
                  color: '#374151' 
                }}>
                  Relationship
                </label>
                <input
                  type="text"
                  value={formData.emergencyContact.relationship}
                  onChange={(e) => handleEmergencyContactChange('relationship', e.target.value)}
                  placeholder="e.g., Spouse, Parent, Sibling"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>
            </div>
          </div>

          <div>
            <h3 style={{ 
              margin: '0 0 1.5rem', 
              fontSize: '1.125rem', 
              fontWeight: '600', 
              color: '#1f2937' 
            }}>
              Professional Information
            </h3>
            
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: '500', 
                  color: '#374151' 
                }}>
                  Specializations (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.specializations}
                  onChange={(e) => setFormData(prev => ({ ...prev, specializations: e.target.value }))}
                  placeholder="e.g., Engine Diagnostics, Electrical Systems, Safety Inspections"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: '500', 
                  color: '#374151' 
                }}>
                  Certifications (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.certifications}
                  onChange={(e) => setFormData(prev => ({ ...prev, certifications: e.target.value }))}
                  placeholder="e.g., ASE Certified, State Inspector License"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontWeight: '500', 
                  color: '#374151' 
                }}>
                  Experience
                </label>
                <textarea
                  name="experience"
                  value={formData.experience}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Describe your inspection experience, years of service, notable achievements, etc."
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>
            </div>
          </div>
        </form>

        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '1rem',
          padding: '0 2rem 2rem 2rem',
          borderTop: '1px solid #e5e7eb',
          paddingTop: '1.5rem'
        }}>
          <button 
            type="button" 
            onClick={onClose}
            style={{
              padding: '0.75rem 1.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: 'white',
              color: '#374151',
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: isLoading ? '#9ca3af' : '#3b82f6',
              color: 'white',
              fontSize: '0.875rem',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid transparent',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Saving...
              </>
            ) : (
              <>
                <SaveIcon size={16} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfilePage({ user, onProfileUpdate }) {
  const [showEditModal, setShowEditModal] = useState(false);

  const handleProfileUpdate = (updatedUser) => {
    onProfileUpdate?.(updatedUser);
    setShowEditModal(false);
  };

  const profile = user?.profile || {};

  return (
    <div style={{ 
      width: '100%',
      display: 'flex',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '2rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        marginBottom: '2rem',
        width: '100%',
        maxWidth: '800px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '2rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div>
            <h2 style={{ 
              margin: '0 0 0.5rem', 
              fontSize: '1.5rem', 
              fontWeight: '600', 
              color: '#1f2937' 
            }}>
              Inspector Profile
            </h2>
            <p style={{ 
              margin: 0, 
              color: '#6b7280', 
              fontSize: '0.875rem' 
            }}>
              View and manage your personal information
            </p>
          </div>
          {/* <button 
            type="button" 
            onClick={() => setShowEditModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}
          >
            <EditIcon size={16} />
            Edit Profile
          </button> */}
        </div>

        <div>
          {/* Profile Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '2rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid #f3f4f6'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <UserIcon size={32} />
            </div>
            <div>
              <h3 style={{ 
                margin: '0 0 0.25rem', 
                fontSize: '1.25rem', 
                fontWeight: '600', 
                color: '#1f2937' 
              }}>
                {profile.firstName && profile.lastName
                  ? `${profile.firstName} ${profile.lastName}`
                  : user?.email || "Inspector"}
              </h3>
              <p style={{ 
                margin: '0 0 0.25rem', 
                color: '#6b7280', 
                fontSize: '0.875rem' 
              }}>
                Vehicle Inspector
              </p>
              <p style={{
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#9ca3af',
                fontSize: '0.875rem'
              }}>
                <MailIcon size={16} />
                {user?.email}
              </p>
            </div>
          </div>

          {/* Profile Sections */}
          <div style={{ display: 'grid', gap: '2rem' }}>
            {/* Personal Information */}
            <div>
              <h4 style={{
                margin: '0 0 1rem',
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                Personal Information
              </h4>
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1rem',
                display: 'grid',
                gap: '0.75rem'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center' 
                }}>
                  <span style={{ fontWeight: '500', color: '#374151' }}>First Name:</span>
                  <span style={{ color: '#6b7280' }}>{profile.firstName || 'Not provided'}</span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center' 
                }}>
                  <span style={{ fontWeight: '500', color: '#374151' }}>Last Name:</span>
                  <span style={{ color: '#6b7280' }}>{profile.lastName || 'Not provided'}</span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center' 
                }}>
                  <span style={{ 
                    fontWeight: '500', 
                    color: '#374151',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <PhoneIcon size={16} />
                    Phone:
                  </span>
                  <span style={{ color: '#6b7280' }}>{profile.phone || 'Not provided'}</span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center' 
                }}>
                  <span style={{ 
                    fontWeight: '500', 
                    color: '#374151',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <CalendarIcon size={16} />
                    Date of Birth:
                  </span>
                  <span style={{ color: '#6b7280' }}>
                    {profile.dateOfBirth 
                      ? new Date(profile.dateOfBirth).toLocaleDateString()
                      : 'Not provided'
                    }
                  </span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  gap: '1rem'
                }}>
                  <span style={{ 
                    fontWeight: '500', 
                    color: '#374151',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    minWidth: 'fit-content'
                  }}>
                    <MapPinIcon size={16} />
                    Address:
                  </span>
                  <span style={{ color: '#6b7280', textAlign: 'right' }}>
                    {profile.address || 'Not provided'}
                  </span>
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            {/* <div>
              <h4 style={{
                margin: '0 0 1rem',
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                Emergency Contact
              </h4>
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1rem',
                display: 'grid',
                gap: '0.75rem'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center' 
                }}>
                  <span style={{ fontWeight: '500', color: '#374151' }}>Name:</span>
                  <span style={{ color: '#6b7280' }}>{profile.emergencyContact?.name || 'Not provided'}</span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center' 
                }}>
                  <span style={{ fontWeight: '500', color: '#374151' }}>Phone:</span>
                  <span style={{ color: '#6b7280' }}>{profile.emergencyContact?.phone || 'Not provided'}</span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center' 
                }}>
                  <span style={{ fontWeight: '500', color: '#374151' }}>Relationship:</span>
                  <span style={{ color: '#6b7280' }}>{profile.emergencyContact?.relationship || 'Not provided'}</span>
                </div>
              </div>
            </div> */}

            {/* Professional Information */}
            {/* <div>
              <h4 style={{
                margin: '0 0 1rem',
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                Professional Information
              </h4>
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1rem',
                display: 'grid',
                gap: '0.75rem'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  gap: '1rem'
                }}>
                  <span style={{ fontWeight: '500', color: '#374151', minWidth: 'fit-content' }}>Specializations:</span>
                  <span style={{ color: '#6b7280', textAlign: 'right' }}>
                    {profile.specializations && profile.specializations.length > 0
                      ? profile.specializations.join(', ')
                      : 'Not provided'
                    }
                  </span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  gap: '1rem'
                }}>
                  <span style={{ fontWeight: '500', color: '#374151', minWidth: 'fit-content' }}>Certifications:</span>
                  <span style={{ color: '#6b7280', textAlign: 'right' }}>
                    {profile.certifications && profile.certifications.length > 0
                      ? profile.certifications.join(', ')
                      : 'Not provided'
                    }
                  </span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  gap: '1rem'
                }}>
                  <span style={{ fontWeight: '500', color: '#374151', minWidth: 'fit-content' }}>Experience:</span>
                  <span style={{ color: '#6b7280', textAlign: 'right' }}>
                    {profile.experience || 'Not provided'}
                  </span>
                </div>
              </div>
            </div> */}
          </div>
        </div>
      </div>

      <ProfileEditModal
        user={user}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onUpdate={handleProfileUpdate}
      />

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default ProfilePage;