/**
 * Country data for phone number country code selector
 * Includes country name, ISO code, phone code, and flag emoji
 */

export interface Country {
  name: string;
  iso2: string;
  dialCode: string;
  flag: string;
  format?: string; // Phone number format pattern
  priority?: number; // For sorting popular countries first
}

export const COUNTRIES: Country[] = [
  // Popular countries first (priority 1)
  { name: 'United States', iso2: 'US', dialCode: '+1', flag: '🇺🇸', format: '(###) ###-####', priority: 1 },
  { name: 'Canada', iso2: 'CA', dialCode: '+1', flag: '🇨🇦', format: '(###) ###-####', priority: 1 },
  { name: 'United Kingdom', iso2: 'GB', dialCode: '+44', flag: '🇬🇧', format: '#### ### ####', priority: 1 },
  { name: 'Australia', iso2: 'AU', dialCode: '+61', flag: '🇦🇺', format: '#### ### ###', priority: 1 },
  { name: 'Germany', iso2: 'DE', dialCode: '+49', flag: '🇩🇪', format: '### ### ####', priority: 1 },
  { name: 'France', iso2: 'FR', dialCode: '+33', flag: '🇫🇷', format: '## ## ## ## ##', priority: 1 },
  { name: 'Japan', iso2: 'JP', dialCode: '+81', flag: '🇯🇵', format: '###-####-####', priority: 1 },
  { name: 'China', iso2: 'CN', dialCode: '+86', flag: '🇨🇳', format: '### #### ####', priority: 1 },
  { name: 'India', iso2: 'IN', dialCode: '+91', flag: '🇮🇳', format: '##### #####', priority: 1 },
  { name: 'Brazil', iso2: 'BR', dialCode: '+55', flag: '🇧🇷', format: '(##) #####-####', priority: 1 },

  // All other countries alphabetically
  { name: 'Afghanistan', iso2: 'AF', dialCode: '+93', flag: '🇦🇫' },
  { name: 'Albania', iso2: 'AL', dialCode: '+355', flag: '🇦🇱' },
  { name: 'Algeria', iso2: 'DZ', dialCode: '+213', flag: '🇩🇿' },
  { name: 'American Samoa', iso2: 'AS', dialCode: '+1684', flag: '🇦🇸' },
  { name: 'Andorra', iso2: 'AD', dialCode: '+376', flag: '🇦🇩' },
  { name: 'Angola', iso2: 'AO', dialCode: '+244', flag: '🇦🇴' },
  { name: 'Anguilla', iso2: 'AI', dialCode: '+1264', flag: '🇦🇮' },
  { name: 'Antarctica', iso2: 'AQ', dialCode: '+672', flag: '🇦🇶' },
  { name: 'Antigua and Barbuda', iso2: 'AG', dialCode: '+1268', flag: '🇦🇬' },
  { name: 'Argentina', iso2: 'AR', dialCode: '+54', flag: '🇦🇷' },
  { name: 'Armenia', iso2: 'AM', dialCode: '+374', flag: '🇦🇲' },
  { name: 'Aruba', iso2: 'AW', dialCode: '+297', flag: '🇦🇼' },
  { name: 'Austria', iso2: 'AT', dialCode: '+43', flag: '🇦🇹' },
  { name: 'Azerbaijan', iso2: 'AZ', dialCode: '+994', flag: '🇦🇿' },
  { name: 'Bahamas', iso2: 'BS', dialCode: '+1242', flag: '🇧🇸' },
  { name: 'Bahrain', iso2: 'BH', dialCode: '+973', flag: '🇧🇭' },
  { name: 'Bangladesh', iso2: 'BD', dialCode: '+880', flag: '🇧🇩' },
  { name: 'Barbados', iso2: 'BB', dialCode: '+1246', flag: '🇧🇧' },
  { name: 'Belarus', iso2: 'BY', dialCode: '+375', flag: '🇧🇾' },
  { name: 'Belgium', iso2: 'BE', dialCode: '+32', flag: '🇧🇪' },
  { name: 'Belize', iso2: 'BZ', dialCode: '+501', flag: '🇧🇿' },
  { name: 'Benin', iso2: 'BJ', dialCode: '+229', flag: '🇧🇯' },
  { name: 'Bermuda', iso2: 'BM', dialCode: '+1441', flag: '🇧🇲' },
  { name: 'Bhutan', iso2: 'BT', dialCode: '+975', flag: '🇧🇹' },
  { name: 'Bolivia', iso2: 'BO', dialCode: '+591', flag: '🇧🇴' },
  { name: 'Bosnia and Herzegovina', iso2: 'BA', dialCode: '+387', flag: '🇧🇦' },
  { name: 'Botswana', iso2: 'BW', dialCode: '+267', flag: '🇧🇼' },
  { name: 'Bouvet Island', iso2: 'BV', dialCode: '+47', flag: '🇧🇻' },
  { name: 'British Indian Ocean Territory', iso2: 'IO', dialCode: '+246', flag: '🇮🇴' },
  { name: 'Brunei Darussalam', iso2: 'BN', dialCode: '+673', flag: '🇧🇳' },
  { name: 'Bulgaria', iso2: 'BG', dialCode: '+359', flag: '🇧🇬' },
  { name: 'Burkina Faso', iso2: 'BF', dialCode: '+226', flag: '🇧🇫' },
  { name: 'Burundi', iso2: 'BI', dialCode: '+257', flag: '🇧🇮' },
  { name: 'Cambodia', iso2: 'KH', dialCode: '+855', flag: '🇰🇭' },
  { name: 'Cameroon', iso2: 'CM', dialCode: '+237', flag: '🇨🇲' },
  { name: 'Cape Verde', iso2: 'CV', dialCode: '+238', flag: '🇨🇻' },
  { name: 'Cayman Islands', iso2: 'KY', dialCode: '+1345', flag: '🇰🇾' },
  { name: 'Central African Republic', iso2: 'CF', dialCode: '+236', flag: '🇨🇫' },
  { name: 'Chad', iso2: 'TD', dialCode: '+235', flag: '🇹🇩' },
  { name: 'Chile', iso2: 'CL', dialCode: '+56', flag: '🇨🇱' },
  { name: 'Christmas Island', iso2: 'CX', dialCode: '+61', flag: '🇨🇽' },
  { name: 'Cocos (Keeling) Islands', iso2: 'CC', dialCode: '+61', flag: '🇨🇨' },
  { name: 'Colombia', iso2: 'CO', dialCode: '+57', flag: '🇨🇴' },
  { name: 'Comoros', iso2: 'KM', dialCode: '+269', flag: '🇰🇲' },
  { name: 'Congo', iso2: 'CG', dialCode: '+242', flag: '🇨🇬' },
  { name: 'Congo, Democratic Republic', iso2: 'CD', dialCode: '+243', flag: '🇨🇩' },
  { name: 'Cook Islands', iso2: 'CK', dialCode: '+682', flag: '🇨🇰' },
  { name: 'Costa Rica', iso2: 'CR', dialCode: '+506', flag: '🇨🇷' },
  { name: 'Croatia', iso2: 'HR', dialCode: '+385', flag: '🇭🇷' },
  { name: 'Cuba', iso2: 'CU', dialCode: '+53', flag: '🇨🇺' },
  { name: 'Cyprus', iso2: 'CY', dialCode: '+357', flag: '🇨🇾' },
  { name: 'Czech Republic', iso2: 'CZ', dialCode: '+420', flag: '🇨🇿' },
  { name: 'Denmark', iso2: 'DK', dialCode: '+45', flag: '🇩🇰' },
  { name: 'Djibouti', iso2: 'DJ', dialCode: '+253', flag: '🇩🇯' },
  { name: 'Dominica', iso2: 'DM', dialCode: '+1767', flag: '🇩🇲' },
  { name: 'Dominican Republic', iso2: 'DO', dialCode: '+1', flag: '🇩🇴' },
  { name: 'Ecuador', iso2: 'EC', dialCode: '+593', flag: '🇪🇨' },
  { name: 'Egypt', iso2: 'EG', dialCode: '+20', flag: '🇪🇬' },
  { name: 'El Salvador', iso2: 'SV', dialCode: '+503', flag: '🇸🇻' },
  { name: 'Equatorial Guinea', iso2: 'GQ', dialCode: '+240', flag: '🇬🇶' },
  { name: 'Eritrea', iso2: 'ER', dialCode: '+291', flag: '🇪🇷' },
  { name: 'Estonia', iso2: 'EE', dialCode: '+372', flag: '🇪🇪' },
  { name: 'Ethiopia', iso2: 'ET', dialCode: '+251', flag: '🇪🇹' },
  { name: 'Falkland Islands', iso2: 'FK', dialCode: '+500', flag: '🇫🇰' },
  { name: 'Faroe Islands', iso2: 'FO', dialCode: '+298', flag: '🇫🇴' },
  { name: 'Fiji', iso2: 'FJ', dialCode: '+679', flag: '🇫🇯' },
  { name: 'Finland', iso2: 'FI', dialCode: '+358', flag: '🇫🇮' },
  { name: 'French Guiana', iso2: 'GF', dialCode: '+594', flag: '🇬🇫' },
  { name: 'French Polynesia', iso2: 'PF', dialCode: '+689', flag: '🇵🇫' },
  { name: 'French Southern Territories', iso2: 'TF', dialCode: '+262', flag: '🇹🇫' },
  { name: 'Gabon', iso2: 'GA', dialCode: '+241', flag: '🇬🇦' },
  { name: 'Gambia', iso2: 'GM', dialCode: '+220', flag: '🇬🇲' },
  { name: 'Georgia', iso2: 'GE', dialCode: '+995', flag: '🇬🇪' },
  { name: 'Ghana', iso2: 'GH', dialCode: '+233', flag: '🇬🇭' },
  { name: 'Gibraltar', iso2: 'GI', dialCode: '+350', flag: '🇬🇮' },
  { name: 'Greece', iso2: 'GR', dialCode: '+30', flag: '🇬🇷' },
  { name: 'Greenland', iso2: 'GL', dialCode: '+299', flag: '🇬🇱' },
  { name: 'Grenada', iso2: 'GD', dialCode: '+1473', flag: '🇬🇩' },
  { name: 'Guadeloupe', iso2: 'GP', dialCode: '+590', flag: '🇬🇵' },
  { name: 'Guam', iso2: 'GU', dialCode: '+1671', flag: '🇬🇺' },
  { name: 'Guatemala', iso2: 'GT', dialCode: '+502', flag: '🇬🇹' },
  { name: 'Guernsey', iso2: 'GG', dialCode: '+44', flag: '🇬🇬' },
  { name: 'Guinea', iso2: 'GN', dialCode: '+224', flag: '🇬🇳' },
  { name: 'Guinea-Bissau', iso2: 'GW', dialCode: '+245', flag: '🇬🇼' },
  { name: 'Guyana', iso2: 'GY', dialCode: '+592', flag: '🇬🇾' },
  { name: 'Haiti', iso2: 'HT', dialCode: '+509', flag: '🇭🇹' },
  { name: 'Heard Island & McDonald Islands', iso2: 'HM', dialCode: '+672', flag: '🇭🇲' },
  { name: 'Holy See (Vatican City State)', iso2: 'VA', dialCode: '+379', flag: '🇻🇦' },
  { name: 'Honduras', iso2: 'HN', dialCode: '+504', flag: '🇭🇳' },
  { name: 'Hong Kong', iso2: 'HK', dialCode: '+852', flag: '🇭🇰' },
  { name: 'Hungary', iso2: 'HU', dialCode: '+36', flag: '🇭🇺' },
  { name: 'Iceland', iso2: 'IS', dialCode: '+354', flag: '🇮🇸' },
  { name: 'Indonesia', iso2: 'ID', dialCode: '+62', flag: '🇮🇩' },
  { name: 'Iran', iso2: 'IR', dialCode: '+98', flag: '🇮🇷' },
  { name: 'Iraq', iso2: 'IQ', dialCode: '+964', flag: '🇮🇶' },
  { name: 'Ireland', iso2: 'IE', dialCode: '+353', flag: '🇮🇪' },
  { name: 'Isle of Man', iso2: 'IM', dialCode: '+44', flag: '🇮🇲' },
  { name: 'Israel', iso2: 'IL', dialCode: '+972', flag: '🇮🇱' },
  { name: 'Italy', iso2: 'IT', dialCode: '+39', flag: '🇮🇹' },
  { name: 'Ivory Coast', iso2: 'CI', dialCode: '+225', flag: '🇨🇮' },
  { name: 'Jamaica', iso2: 'JM', dialCode: '+1876', flag: '🇯🇲' },
  { name: 'Jersey', iso2: 'JE', dialCode: '+44', flag: '🇯🇪' },
  { name: 'Jordan', iso2: 'JO', dialCode: '+962', flag: '🇯🇴' },
  { name: 'Kazakhstan', iso2: 'KZ', dialCode: '+7', flag: '🇰🇿' },
  { name: 'Kenya', iso2: 'KE', dialCode: '+254', flag: '🇰🇪' },
  { name: 'Kiribati', iso2: 'KI', dialCode: '+686', flag: '🇰🇮' },
  { name: 'Korea, Democratic People\'s Republic of', iso2: 'KP', dialCode: '+850', flag: '🇰🇵' },
  { name: 'Korea, Republic of', iso2: 'KR', dialCode: '+82', flag: '🇰🇷' },
  { name: 'Kuwait', iso2: 'KW', dialCode: '+965', flag: '🇰🇼' },
  { name: 'Kyrgyzstan', iso2: 'KG', dialCode: '+996', flag: '🇰🇬' },
  { name: 'Laos', iso2: 'LA', dialCode: '+856', flag: '🇱🇦' },
  { name: 'Latvia', iso2: 'LV', dialCode: '+371', flag: '🇱🇻' },
  { name: 'Lebanon', iso2: 'LB', dialCode: '+961', flag: '🇱🇧' },
  { name: 'Lesotho', iso2: 'LS', dialCode: '+266', flag: '🇱🇸' },
  { name: 'Liberia', iso2: 'LR', dialCode: '+231', flag: '🇱🇷' },
  { name: 'Libya', iso2: 'LY', dialCode: '+218', flag: '🇱🇾' },
  { name: 'Liechtenstein', iso2: 'LI', dialCode: '+423', flag: '🇱🇮' },
  { name: 'Lithuania', iso2: 'LT', dialCode: '+370', flag: '🇱🇹' },
  { name: 'Luxembourg', iso2: 'LU', dialCode: '+352', flag: '🇱🇺' },
  { name: 'Macao', iso2: 'MO', dialCode: '+853', flag: '🇲🇴' },
  { name: 'Macedonia', iso2: 'MK', dialCode: '+389', flag: '🇲🇰' },
  { name: 'Madagascar', iso2: 'MG', dialCode: '+261', flag: '🇲🇬' },
  { name: 'Malawi', iso2: 'MW', dialCode: '+265', flag: '🇲🇼' },
  { name: 'Malaysia', iso2: 'MY', dialCode: '+60', flag: '🇲🇾' },
  { name: 'Maldives', iso2: 'MV', dialCode: '+960', flag: '🇲🇻' },
  { name: 'Mali', iso2: 'ML', dialCode: '+223', flag: '🇲🇱' },
  { name: 'Malta', iso2: 'MT', dialCode: '+356', flag: '🇲🇹' },
  { name: 'Marshall Islands', iso2: 'MH', dialCode: '+692', flag: '🇲🇭' },
  { name: 'Martinique', iso2: 'MQ', dialCode: '+596', flag: '🇲🇶' },
  { name: 'Mauritania', iso2: 'MR', dialCode: '+222', flag: '🇲🇷' },
  { name: 'Mauritius', iso2: 'MU', dialCode: '+230', flag: '🇲🇺' },
  { name: 'Mayotte', iso2: 'YT', dialCode: '+262', flag: '🇾🇹' },
  { name: 'Mexico', iso2: 'MX', dialCode: '+52', flag: '🇲🇽' },
  { name: 'Micronesia', iso2: 'FM', dialCode: '+691', flag: '🇫🇲' },
  { name: 'Moldova', iso2: 'MD', dialCode: '+373', flag: '🇲🇩' },
  { name: 'Monaco', iso2: 'MC', dialCode: '+377', flag: '🇲🇨' },
  { name: 'Mongolia', iso2: 'MN', dialCode: '+976', flag: '🇲🇳' },
  { name: 'Montenegro', iso2: 'ME', dialCode: '+382', flag: '🇲🇪' },
  { name: 'Montserrat', iso2: 'MS', dialCode: '+1664', flag: '🇲🇸' },
  { name: 'Morocco', iso2: 'MA', dialCode: '+212', flag: '🇲🇦' },
  { name: 'Mozambique', iso2: 'MZ', dialCode: '+258', flag: '🇲🇿' },
  { name: 'Myanmar', iso2: 'MM', dialCode: '+95', flag: '🇲🇲' },
  { name: 'Namibia', iso2: 'NA', dialCode: '+264', flag: '🇳🇦' },
  { name: 'Nauru', iso2: 'NR', dialCode: '+674', flag: '🇳🇷' },
  { name: 'Nepal', iso2: 'NP', dialCode: '+977', flag: '🇳🇵' },
  { name: 'Netherlands', iso2: 'NL', dialCode: '+31', flag: '🇳🇱', format: '## ### ####' },
  { name: 'Netherlands Antilles', iso2: 'AN', dialCode: '+599', flag: '🇦🇳' },
  { name: 'New Caledonia', iso2: 'NC', dialCode: '+687', flag: '🇳🇨' },
  { name: 'New Zealand', iso2: 'NZ', dialCode: '+64', flag: '🇳🇿', format: '### ### ####' },
  { name: 'Nicaragua', iso2: 'NI', dialCode: '+505', flag: '🇳🇮' },
  { name: 'Niger', iso2: 'NE', dialCode: '+227', flag: '🇳🇪' },
  { name: 'Nigeria', iso2: 'NG', dialCode: '+234', flag: '🇳🇬' },
  { name: 'Niue', iso2: 'NU', dialCode: '+683', flag: '🇳🇺' },
  { name: 'Norfolk Island', iso2: 'NF', dialCode: '+672', flag: '🇳🇫' },
  { name: 'Northern Mariana Islands', iso2: 'MP', dialCode: '+1670', flag: '🇲🇵' },
  { name: 'Norway', iso2: 'NO', dialCode: '+47', flag: '🇳🇴', format: '### ## ###' },
  { name: 'Oman', iso2: 'OM', dialCode: '+968', flag: '🇴🇲' },
  { name: 'Pakistan', iso2: 'PK', dialCode: '+92', flag: '🇵🇰' },
  { name: 'Palau', iso2: 'PW', dialCode: '+680', flag: '🇵🇼' },
  { name: 'Palestinian Territory', iso2: 'PS', dialCode: '+970', flag: '🇵🇸' },
  { name: 'Panama', iso2: 'PA', dialCode: '+507', flag: '🇵🇦' },
  { name: 'Papua New Guinea', iso2: 'PG', dialCode: '+675', flag: '🇵🇬' },
  { name: 'Paraguay', iso2: 'PY', dialCode: '+595', flag: '🇵🇾' },
  { name: 'Peru', iso2: 'PE', dialCode: '+51', flag: '🇵🇪' },
  { name: 'Philippines', iso2: 'PH', dialCode: '+63', flag: '🇵🇭' },
  { name: 'Pitcairn', iso2: 'PN', dialCode: '+64', flag: '🇵🇳' },
  { name: 'Poland', iso2: 'PL', dialCode: '+48', flag: '🇵🇱' },
  { name: 'Portugal', iso2: 'PT', dialCode: '+351', flag: '🇵🇹' },
  { name: 'Puerto Rico', iso2: 'PR', dialCode: '+1787', flag: '🇵🇷' },
  { name: 'Qatar', iso2: 'QA', dialCode: '+974', flag: '🇶🇦' },
  { name: 'Reunion', iso2: 'RE', dialCode: '+262', flag: '🇷🇪' },
  { name: 'Romania', iso2: 'RO', dialCode: '+40', flag: '🇷🇴' },
  { name: 'Russian Federation', iso2: 'RU', dialCode: '+7', flag: '🇷🇺' },
  { name: 'Rwanda', iso2: 'RW', dialCode: '+250', flag: '🇷🇼' },
  { name: 'Saint Barthelemy', iso2: 'BL', dialCode: '+590', flag: '🇧🇱' },
  { name: 'Saint Helena', iso2: 'SH', dialCode: '+290', flag: '🇸🇭' },
  { name: 'Saint Kitts and Nevis', iso2: 'KN', dialCode: '+1869', flag: '🇰🇳' },
  { name: 'Saint Lucia', iso2: 'LC', dialCode: '+1758', flag: '🇱🇨' },
  { name: 'Saint Martin', iso2: 'MF', dialCode: '+590', flag: '🇲🇫' },
  { name: 'Saint Pierre and Miquelon', iso2: 'PM', dialCode: '+508', flag: '🇵🇲' },
  { name: 'Saint Vincent and the Grenadines', iso2: 'VC', dialCode: '+1784', flag: '🇻🇨' },
  { name: 'Samoa', iso2: 'WS', dialCode: '+685', flag: '🇼🇸' },
  { name: 'San Marino', iso2: 'SM', dialCode: '+378', flag: '🇸🇲' },
  { name: 'Sao Tome and Principe', iso2: 'ST', dialCode: '+239', flag: '🇸🇹' },
  { name: 'Saudi Arabia', iso2: 'SA', dialCode: '+966', flag: '🇸🇦' },
  { name: 'Senegal', iso2: 'SN', dialCode: '+221', flag: '🇸🇳' },
  { name: 'Serbia', iso2: 'RS', dialCode: '+381', flag: '🇷🇸' },
  { name: 'Seychelles', iso2: 'SC', dialCode: '+248', flag: '🇸🇨' },
  { name: 'Sierra Leone', iso2: 'SL', dialCode: '+232', flag: '🇸🇱' },
  { name: 'Singapore', iso2: 'SG', dialCode: '+65', flag: '🇸🇬' },
  { name: 'Slovakia', iso2: 'SK', dialCode: '+421', flag: '🇸🇰' },
  { name: 'Slovenia', iso2: 'SI', dialCode: '+386', flag: '🇸🇮' },
  { name: 'Solomon Islands', iso2: 'SB', dialCode: '+677', flag: '🇸🇧' },
  { name: 'Somalia', iso2: 'SO', dialCode: '+252', flag: '🇸🇴' },
  { name: 'South Africa', iso2: 'ZA', dialCode: '+27', flag: '🇿🇦' },
  { name: 'South Georgia and the South Sandwich Islands', iso2: 'GS', dialCode: '+500', flag: '🇬🇸' },
  { name: 'Spain', iso2: 'ES', dialCode: '+34', flag: '🇪🇸' },
  { name: 'Sri Lanka', iso2: 'LK', dialCode: '+94', flag: '🇱🇰' },
  { name: 'Sudan', iso2: 'SD', dialCode: '+249', flag: '🇸🇩' },
  { name: 'Suriname', iso2: 'SR', dialCode: '+597', flag: '🇸🇷' },
  { name: 'Svalbard and Jan Mayen', iso2: 'SJ', dialCode: '+47', flag: '🇸🇯' },
  { name: 'Swaziland', iso2: 'SZ', dialCode: '+268', flag: '🇸🇿' },
  { name: 'Sweden', iso2: 'SE', dialCode: '+46', flag: '🇸🇪' },
  { name: 'Switzerland', iso2: 'CH', dialCode: '+41', flag: '🇨🇭' },
  { name: 'Syrian Arab Republic', iso2: 'SY', dialCode: '+963', flag: '🇸🇾' },
  { name: 'Taiwan', iso2: 'TW', dialCode: '+886', flag: '🇹🇼' },
  { name: 'Tajikistan', iso2: 'TJ', dialCode: '+992', flag: '🇹🇯' },
  { name: 'Tanzania', iso2: 'TZ', dialCode: '+255', flag: '🇹🇿' },
  { name: 'Thailand', iso2: 'TH', dialCode: '+66', flag: '🇹🇭' },
  { name: 'Timor-Leste', iso2: 'TL', dialCode: '+670', flag: '🇹🇱' },
  { name: 'Togo', iso2: 'TG', dialCode: '+228', flag: '🇹🇬' },
  { name: 'Tokelau', iso2: 'TK', dialCode: '+690', flag: '🇹🇰' },
  { name: 'Tonga', iso2: 'TO', dialCode: '+676', flag: '🇹🇴' },
  { name: 'Trinidad and Tobago', iso2: 'TT', dialCode: '+1868', flag: '🇹🇹' },
  { name: 'Tunisia', iso2: 'TN', dialCode: '+216', flag: '🇹🇳' },
  { name: 'Turkey', iso2: 'TR', dialCode: '+90', flag: '🇹🇷' },
  { name: 'Turkmenistan', iso2: 'TM', dialCode: '+993', flag: '🇹🇲' },
  { name: 'Turks and Caicos Islands', iso2: 'TC', dialCode: '+1649', flag: '🇹🇨' },
  { name: 'Tuvalu', iso2: 'TV', dialCode: '+688', flag: '🇹🇻' },
  { name: 'Uganda', iso2: 'UG', dialCode: '+256', flag: '🇺🇬' },
  { name: 'Ukraine', iso2: 'UA', dialCode: '+380', flag: '🇺🇦' },
  { name: 'United Arab Emirates', iso2: 'AE', dialCode: '+971', flag: '🇦🇪' },
  { name: 'United States Minor Outlying Islands', iso2: 'UM', dialCode: '+1', flag: '🇺🇲' },
  { name: 'Uruguay', iso2: 'UY', dialCode: '+598', flag: '🇺🇾' },
  { name: 'Uzbekistan', iso2: 'UZ', dialCode: '+998', flag: '🇺🇿' },
  { name: 'Vanuatu', iso2: 'VU', dialCode: '+678', flag: '🇻🇺' },
  { name: 'Venezuela', iso2: 'VE', dialCode: '+58', flag: '🇻🇪' },
  { name: 'Viet Nam', iso2: 'VN', dialCode: '+84', flag: '🇻🇳' },
  { name: 'Virgin Islands, British', iso2: 'VG', dialCode: '+1284', flag: '🇻🇬' },
  { name: 'Virgin Islands, U.S.', iso2: 'VI', dialCode: '+1340', flag: '🇻🇮' },
  { name: 'Wallis and Futuna', iso2: 'WF', dialCode: '+681', flag: '🇼🇫' },
  { name: 'Western Sahara', iso2: 'EH', dialCode: '+212', flag: '🇪🇭' },
  { name: 'Yemen', iso2: 'YE', dialCode: '+967', flag: '🇾🇪' },
  { name: 'Zambia', iso2: 'ZM', dialCode: '+260', flag: '🇿🇲' },
  { name: 'Zimbabwe', iso2: 'ZW', dialCode: '+263', flag: '🇿🇼' },
];

/**
 * Get default country based on device locale
 */
export const getDefaultCountry = (): Country => {
  // Try to get device locale
  const locale = Intl.DateTimeFormat().resolvedOptions().locale;
  const countryCode = locale.split('-')[1]?.toUpperCase();
  
  if (countryCode) {
    const country = COUNTRIES.find(c => c.iso2 === countryCode);
    if (country) return country;
  }
  
  // Default to US if locale detection fails
  return COUNTRIES.find(c => c.iso2 === 'US') || COUNTRIES[0];
};

/**
 * Get sorted countries with popular ones first
 */
export const getSortedCountries = (): Country[] => {
  return [...COUNTRIES].sort((a, b) => {
    // Priority countries first
    if (a.priority && !b.priority) return -1;
    if (!a.priority && b.priority) return 1;
    if (a.priority && b.priority) return a.name.localeCompare(b.name);

    // Then alphabetical
    return a.name.localeCompare(b.name);
  });
};

/**
 * Search countries by name or dial code
 */
export const searchCountries = (query: string): Country[] => {
  if (!query.trim()) return getSortedCountries();
  
  const searchTerm = query.toLowerCase().trim();
  
  return COUNTRIES.filter(country => 
    country.name.toLowerCase().includes(searchTerm) ||
    country.dialCode.includes(searchTerm) ||
    country.iso2.toLowerCase().includes(searchTerm)
  ).sort((a, b) => {
    // Exact matches first
    if (a.name.toLowerCase() === searchTerm) return -1;
    if (b.name.toLowerCase() === searchTerm) return 1;
    
    // Then starts with
    if (a.name.toLowerCase().startsWith(searchTerm) && !b.name.toLowerCase().startsWith(searchTerm)) return -1;
    if (!a.name.toLowerCase().startsWith(searchTerm) && b.name.toLowerCase().startsWith(searchTerm)) return 1;
    
    // Then alphabetical
    return a.name.localeCompare(b.name);
  });
};
