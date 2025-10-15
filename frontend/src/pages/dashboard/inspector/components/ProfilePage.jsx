import { UserIcon, MailIcon, PhoneIcon, MapPinIcon, CalendarIcon } from 'lucide-react';

function ProfilePage({ user, onProfileUpdate }) {
  const profile = user?.profile || {};

  return (
    <div className="w-full flex justify-center p-6">
      <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700 w-full max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-start mb-8 pb-6 border-b border-gray-700">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">
              Inspector Profile
            </h2>
            <p className="text-gray-400">
              View your personal information
            </p>
          </div>
        </div>

        <div>
          {/* Profile Header */}
          <div className="flex items-center gap-6 mb-8 pb-6 border-b border-gray-700">
            <div className="w-20 h-20 bg-gradient-to-br from-[#484848] to-neutral-900 rounded-full flex items-center justify-center text-white font-semibold text-2xl shadow-lg">
              <UserIcon size={32} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">
                {profile.firstName && profile.lastName
                  ? `${profile.firstName} ${profile.lastName}`
                  : user?.email || "Inspector"}
              </h3>
              <p className="text-gray-400 mb-2">
                Vehicle Inspector
              </p>
              <p className="flex items-center gap-2 text-gray-400">
                <MailIcon size={18} />
                {user?.email}
              </p>
            </div>
          </div>

          {/* Profile Sections */}
          <div className="space-y-8">
            {/* Personal Information */}
            <div>
              <h4 className="text-xl font-semibold text-white mb-4">
                Personal Information
              </h4>
              <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 font-medium">First Name:</span>
                  <span className="text-gray-400">{profile.firstName || 'Not provided'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 font-medium">Last Name:</span>
                  <span className="text-gray-400">{profile.lastName || 'Not provided'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 font-medium flex items-center gap-2">
                    <PhoneIcon size={18} />
                    Phone:
                  </span>
                  <span className="text-gray-400">{profile.phone || '0762546737'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 font-medium flex items-center gap-2">
                    <CalendarIcon size={18} />
                    Date of Birth:
                  </span>
                  <span className="text-gray-400">
                    {profile.dateOfBirth 
                      ? new Date(profile.dateOfBirth).toLocaleDateString()
                      : 'Not provided'
                    }
                  </span>
                </div>
                <div className="flex justify-between items-start gap-4">
                  <span className="text-gray-300 font-medium flex items-center gap-2 min-w-fit">
                    <MapPinIcon size={18} />
                    Address:
                  </span>
                  <span className="text-gray-400 text-right">
                    {profile.address || 'Colombo'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;